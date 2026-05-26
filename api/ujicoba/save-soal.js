// api/ujicoba/save-soal.js
// API untuk admin: simpan/update file soal ke GitHub repo

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan POST.' });
  }

  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO, ADMIN_KEY } = process.env;

  if (!GITHUB_PAT || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Environment variable belum dikonfigurasi.' });
  }

  // Validasi admin key
  const authHeader = req.headers['x-admin-key'];
  if (!ADMIN_KEY || authHeader !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Akses ditolak. Admin key tidak valid.' });
  }

  const body = req.body;
  if (!body || !body.tesKey || !Array.isArray(body.soal)) {
    return res.status(400).json({ error: 'Body harus mengandung tesKey dan array soal.' });
  }

  const filePath = `data/soal-${body.tesKey}.json`;
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const headers = {
    'Authorization': `Bearer ${GITHUB_PAT}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    // Cek apakah file sudah ada (ambil SHA)
    let sha = null;
    const getRes = await fetch(apiBase, { headers });
    if (getRes.ok) {
      const json = await getRes.json();
      sha = json.sha;
    }

    const payload = {
      nama: body.nama || body.tesKey.toUpperCase(),
      durasi: body.durasi || 3600,
      soal: body.soal
    };

    const newContent = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64');

    const putBody = {
      message: `[admin] Update soal: ${body.tesKey} (${body.soal.length} soal)`,
      content: newContent,
      ...(sha && { sha })
    };

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return res.status(putRes.status).json({ error: `Gagal menyimpan ke GitHub: ${putRes.status}`, detail: errText });
    }

    return res.status(200).json({ success: true, message: `Soal ${body.tesKey} berhasil disimpan (${body.soal.length} soal).` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
