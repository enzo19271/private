import { NextResponse } from 'next/server';

/**
 * Vercel Middleware – Admin Key Gate
 * ─────────────────────────────────────────────────────────
 * Melindungi halaman admin, analytics, dan config.
 * Kunci disimpan di environment variable ADMIN_KEY di Vercel.
 *
 * Cara set env var di Vercel:
 *   Dashboard → Project → Settings → Environment Variables
 *   → Name: ADMIN_KEY  Value: (kunci rahasiamu)
 */

const PROTECTED_PATHS = ['/admin.html', '/analytics.html', '/config.html'];
const COOKIE_NAME     = 'kg_admin_session';
const COOKIE_MAX_AGE  = 60 * 60 * 8; // 8 jam (dalam detik)

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Hanya proteksi halaman yang terdaftar
  if (!PROTECTED_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const ADMIN_KEY = process.env.ADMIN_KEY;

  // Jika env var belum diset, tolak akses
  if (!ADMIN_KEY) {
    return new NextResponse('Server misconfigured: ADMIN_KEY not set.', { status: 500 });
  }

  // ── Cek session cookie ──────────────────────────────────
  const sessionCookie = request.cookies.get(COOKIE_NAME);
  if (sessionCookie && sessionCookie.value === ADMIN_KEY) {
    return NextResponse.next(); // sudah login
  }

  // ── Cek POST dari form login ────────────────────────────
  // Login dikirim via query param ?_key=xxx (GET redirect dari form)
  const submittedKey = request.nextUrl.searchParams.get('_key');
  if (submittedKey) {
    if (submittedKey === ADMIN_KEY) {
      // Kunci valid → set cookie, redirect ke halaman bersih (tanpa query)
      const cleanUrl = new URL(pathname, request.url);
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set(COOKIE_NAME, ADMIN_KEY, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });
      return response;
    } else {
      // Kunci salah → tampilkan form dengan pesan error
      return loginPage(pathname, true);
    }
  }

  // ── Belum login → tampilkan halaman login ──────────────
  return loginPage(pathname, false);
}

function loginPage(targetPath, isError) {
  const pageTitle = {
    '/admin.html':     'Admin Panel',
    '/analytics.html': 'Analitik Traffic',
    '/config.html':    'Konfigurasi',
  }[targetPath] || 'Halaman Admin';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Akses Admin – ${pageTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sora', sans-serif;
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
      padding: 20px;
    }
    .card {
      background: #fff; border-radius: 24px;
      padding: 44px 40px 40px; width: 100%; max-width: 420px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.4);
      animation: rise 0.4s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes rise { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
    .icon-wrap {
      width: 68px; height: 68px; border-radius: 20px;
      background: linear-gradient(135deg, #2563eb, #60a5fa);
      display: flex; align-items: center; justify-content: center;
      font-size: 30px; color: #fff; margin: 0 auto 22px;
      box-shadow: 0 10px 24px rgba(37,99,235,0.4);
    }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; text-align:center; margin-bottom: 6px; }
    .subtitle { font-size: 13px; color: #64748b; text-align:center; margin-bottom: 28px; line-height:1.5; }
    label { display:block; font-size:12px; font-weight:600; color:#374151; margin-bottom:6px; letter-spacing:.05em; text-transform:uppercase; }
    .input-wrap { position:relative; margin-bottom: 10px; }
    input[type=password], input[type=text] {
      width:100%; padding: 13px 46px 13px 16px;
      border: 2px solid ${isError ? '#ef4444' : '#e2e8f0'};
      border-radius: 12px; font-size: 15px; font-family:inherit;
      background: #f8fafc; color: #0f172a; outline: none;
      transition: border-color .2s, box-shadow .2s;
      letter-spacing: .08em;
    }
    input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
      ${isError ? '' : ''}
    }
    .eye-btn {
      position:absolute; right:13px; top:50%; transform:translateY(-50%);
      background:none; border:none; cursor:pointer; font-size:20px;
      color:#94a3b8; padding:4px; line-height:1;
    }
    .error-msg {
      display: ${isError ? 'flex' : 'none'};
      align-items:center; gap:6px;
      background:#fef2f2; border:1px solid #fecaca;
      border-radius:8px; padding:10px 12px;
      font-size:13px; color:#dc2626; font-weight:500;
      margin-bottom: 14px;
    }
    button[type=submit] {
      width:100%; padding:13px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color:#fff; border:none; border-radius:12px;
      font-size:15px; font-weight:600; font-family:inherit;
      cursor:pointer; transition: opacity .2s, transform .15s;
      display:flex; align-items:center; justify-content:center; gap:8px;
      margin-top: 4px;
    }
    button[type=submit]:hover { opacity:.92; transform:translateY(-1px); }
    button[type=submit]:active { transform:translateY(0); }
    .footer-note { margin-top:20px; font-size:12px; color:#94a3b8; text-align:center; }
  </style>
</head>
<body>
<div class="card">
  <div class="icon-wrap"><i class='bx bx-shield-quarter'></i></div>
  <h1>Akses Admin</h1>
  <p class="subtitle">Halaman <strong>${pageTitle}</strong> hanya untuk administrator.<br>Masukkan kunci akses untuk melanjutkan.</p>

  <form method="GET" action="${targetPath}">
    <label for="kg-input">Kunci Admin</label>
    <div class="error-msg">
      <i class='bx bx-error-circle'></i> Kunci salah. Coba lagi.
    </div>
    <div class="input-wrap">
      <input type="password" id="kg-input" name="_key" placeholder="Masukkan kunci admin…" autocomplete="off" autofocus required />
      <button type="button" class="eye-btn" onclick="toggleEye()" id="eye-btn">
        <i class='bx bx-hide' id="eye-icon"></i>
      </button>
    </div>
    <button type="submit"><i class='bx bx-log-in-circle'></i> Masuk ke ${pageTitle}</button>
  </form>

  <p class="footer-note">Sesi aktif selama 8 jam setelah login.</p>
</div>
<script>
  function toggleEye() {
    const inp = document.getElementById('kg-input');
    const icon = document.getElementById('eye-icon');
    const isPass = inp.type === 'password';
    inp.type = isPass ? 'text' : 'password';
    icon.className = isPass ? 'bx bx-show' : 'bx bx-hide';
  }
  document.querySelector('form').addEventListener('submit', function(e) {
    const val = document.getElementById('kg-input').value.trim();
    if (!val) { e.preventDefault(); }
  });
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  matcher: ['/admin.html', '/analytics.html', '/config.html'],
};
