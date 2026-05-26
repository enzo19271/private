// api/ujicoba/simpan-hasil.js
// API untuk menyimpan hasil tes ke data/hasil-tes.json di GitHub repo
// TERPISAH dari api/save-data.js — tidak mengganggu endpoint utama.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan POST.' });
  }

  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!GITHUB_PAT || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Environment variable belum dikonfigurasi.' });
  }

  const body = req.body;
  if (!body || !body.tesKey || body.skor === undefined) {
    return res.status(400).json({ error: 'Body harus mengandung tesKey dan skor.' });
  }

  const filePath = 'data/hasil-tes.json';
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const headers = {
    'Authorization': `Bearer ${GITHUB_PAT}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    // Ambil file lama (jika ada)
    let sha = null;
    let existingData = [];
    const getRes = await fetch(apiBase, { headers });
    if (getRes.ok) {
      const json = await getRes.json();
      sha = json.sha;
      const raw = Buffer.from(json.content, 'base64').toString('utf-8');
      existingData = JSON.parse(raw);
    }

    // Tambahkan entri baru
    existingData.push({
      ...body,
      timestamp: new Date().toISOString()
    });

    const newContent = Buffer.from(JSON.stringify(existingData, null, 2)).toString('base64');

    const putBody = {
      message: `[ujicoba] Simpan hasil tes: ${body.tesKey}`,
      content: newContent,
      ...(sha && { sha })
    };

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      return res.status(putRes.status).json({ error: `Gagal menyimpan ke GitHub: ${putRes.status}` });
    }

    return res.status(200).json({ success: true, message: 'Hasil tes berhasil disimpan.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
