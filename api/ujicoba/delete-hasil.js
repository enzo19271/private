// api/ujicoba/delete-hasil.js
// API untuk admin: hapus satu atau semua entri dari hasil-tes.json (scoreboard)

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan POST.' });
  }

  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO, ADMIN_KEY } = process.env;

  if (!GITHUB_PAT || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Environment variable belum dikonfigurasi.' });
  }

  // Validasi admin key
  const authHeader = req.headers['x-admin-key'];
  if (!ADMIN_KEY || authHeader !== ADMIN_KEY) {
    await new Promise(r => setTimeout(r, 500));
    return res.status(403).json({ error: 'Akses ditolak. Admin key tidak valid.' });
  }

  const body = req.body;
  // mode: 'single' (hapus berdasarkan index) atau 'reset' (hapus semua)
  const mode = body?.mode || 'single';

  const filePath = 'data/hasil-tes.json';
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const headers = {
    'Authorization': `Bearer ${GITHUB_PAT}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    // Ambil data yang ada
    let sha = null;
    let existingData = [];
    const getRes = await fetch(apiBase, { headers });

    if (getRes.ok) {
      const json = await getRes.json();
      sha = json.sha;
      try {
        const raw = Buffer.from(json.content, 'base64').toString('utf-8');
        existingData = JSON.parse(raw);
        if (!Array.isArray(existingData)) existingData = [];
      } catch (e) {
        existingData = [];
      }
    } else if (getRes.status === 404) {
      return res.status(404).json({ error: 'File hasil-tes.json tidak ditemukan.' });
    } else {
      return res.status(getRes.status).json({ error: `GitHub API error ${getRes.status}` });
    }

    let newData = [];
    let deletedCount = 0;

    if (mode === 'reset') {
      // Hapus semua data
      deletedCount = existingData.length;
      newData = [];
    } else if (mode === 'single') {
      // Hapus berdasarkan index
      const idx = body?.index;
      if (idx === undefined || idx === null || isNaN(Number(idx))) {
        return res.status(400).json({ error: 'Parameter index diperlukan untuk mode single.' });
      }
      const i = Number(idx);
      if (i < 0 || i >= existingData.length) {
        return res.status(400).json({ error: `Index ${i} di luar batas (total: ${existingData.length})` });
      }
      newData = [...existingData.slice(0, i), ...existingData.slice(i + 1)];
      deletedCount = 1;
    } else if (mode === 'filter') {
      // Hapus berdasarkan nama peserta + tesKey (untuk menghapus semua entri milik 1 user di tes tertentu)
      const { pesertaNama, tesKey } = body;
      if (!pesertaNama) {
        return res.status(400).json({ error: 'Parameter pesertaNama diperlukan untuk mode filter.' });
      }
      newData = existingData.filter(e =>
        !(e.pesertaNama === pesertaNama && (!tesKey || e.tesKey === tesKey))
      );
      deletedCount = existingData.length - newData.length;
    } else {
      return res.status(400).json({ error: `Mode tidak dikenal: ${mode}. Gunakan single, filter, atau reset.` });
    }

    // Simpan kembali ke GitHub
    const newContent = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');
    const commitMsg = mode === 'reset'
      ? `[admin] Reset scoreboard (${deletedCount} entri dihapus)`
      : `[admin] Hapus ${deletedCount} entri dari scoreboard`;

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMsg,
        content: newContent,
        sha
      })
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return res.status(putRes.status).json({ error: `Gagal menyimpan ke GitHub: ${putRes.status}`, detail: errText });
    }

    return res.status(200).json({
      success: true,
      message: mode === 'reset'
        ? `Scoreboard berhasil direset. ${deletedCount} entri dihapus.`
        : `${deletedCount} entri berhasil dihapus.`,
      deletedCount,
      remaining: newData.length
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
