// =============================================================
// FILE: api/login.js  (Vercel Serverless Function)
// Deploy ke Vercel — ini backend-nya
// =============================================================
// SETUP:
//   1. Di Vercel dashboard → Settings → Environment Variables:
//      - GITHUB_PAT   = ghp_xxxxxxxxxxxxxxxx  (Personal Access Token)
//      - GITHUB_OWNER = username GitHub kamu
//      - GITHUB_REPO  = nama repo
//      - JWT_SECRET   = random string panjang (buat secret sendiri)
//   2. File users.json harus ada di root repo GitHub
// =============================================================

const GITHUB_API = "https://api.github.com";

// ── Ambil data users dari GitHub ─────────────────────────────
async function getUsersFromGitHub() {
  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const url = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/users.json`;

  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) throw new Error("Gagal fetch users dari GitHub");

  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return JSON.parse(content);
}

// ── Simple hash SHA-256 (tanpa library eksternal) ─────────────
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Buat JWT sederhana (tanpa library) ───────────────────────
function base64url(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function createJWT(payload) {
  const secret = process.env.JWT_SECRET || "secret-ganti-ini";
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;

  // HMAC-SHA256 pakai Web Crypto API
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput)
  );
  const sigB64 = Buffer.from(sig)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${sigB64}`;
}

// ── Verifikasi JWT ────────────────────────────────────────────
async function verifyJWT(token) {
  try {
    const secret = process.env.JWT_SECRET || "secret-ganti-ini";
    const [header, body, sig] = token.split(".");
    const signingInput = `${header}.${body}`;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBuffer = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuffer,
      new TextEncoder().encode(signingInput)
    );

    if (!valid) return null;
    return JSON.parse(Buffer.from(body, "base64").toString());
  } catch {
    return null;
  }
}

// ── Main Handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Route: POST /api/login ──
  if (req.method === "POST" && req.url.includes("/api/login")) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username & password wajib diisi" });
      }

      const users = await getUsersFromGitHub();
      const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );

      if (!user) {
        return res.status(401).json({ error: "Username atau password salah" });
      }

      // Cek expired
      const now = new Date();
      const expired = new Date(user.expired_at);
      if (now > expired) {
        return res.status(403).json({
          error: "Akun sudah expired",
          expired_at: user.expired_at,
        });
      }

      // Cek status aktif
      if (user.active === false) {
        return res.status(403).json({ error: "Akun dinonaktifkan" });
      }

      // Verifikasi password
      const hashedInput = await sha256(password);
      if (hashedInput !== user.password_hash) {
        return res.status(401).json({ error: "Username atau password salah" });
      }

      // Buat JWT (session 8 jam)
      const sessionDuration = 8 * 60 * 60; // detik
      const payload = {
        sub: user.username,
        name: user.name,
        role: user.role || "user",
        expired_at: user.expired_at,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + sessionDuration,
      };

      const token = await createJWT(payload);

      return res.status(200).json({
        success: true,
        token,
        user: {
          username: user.username,
          name: user.name,
          role: user.role || "user",
          expired_at: user.expired_at,
        },
        session_expires_in: sessionDuration,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error: " + err.message });
    }
  }

  // ── Route: POST /api/verify ── (cek token masih valid)
  if (req.method === "POST" && req.url.includes("/api/verify")) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token tidak ada" });
    }

    const token = authHeader.slice(7);
    const payload = await verifyJWT(token);

    if (!payload) {
      return res.status(401).json({ error: "Token tidak valid" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return res.status(401).json({ error: "Sesi sudah berakhir, silakan login ulang" });
    }

    // Cek expired akun
    if (new Date() > new Date(payload.expired_at)) {
      return res.status(403).json({ error: "Akun sudah expired" });
    }

    return res.status(200).json({ valid: true, user: payload });
  }

  return res.status(404).json({ error: "Route tidak ditemukan" });
}
