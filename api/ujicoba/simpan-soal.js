// api/ujicoba/simpan-soal.js
// Simpan bank soal ke data/soal-{tes}.json di GitHub repo
// Dipanggil dari halaman admin-soal.html

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan POST.' });
  }

  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!GITHUB_PAT || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Environment variable belum dikonfigurasi.' });
  }

  const body = req.body;
  if (!body || !body.tes || !Array.isArray(body.soal)) {
    return res.status(400).json({ error: 'Body harus mengandung tes (string) dan soal (array).' });
  }

  const { tes, judul, durasiMenit, skorMaksimal, soal } = body;

  // Validasi nama tes
  const allowedTes = ['toefl', 'iq', 'ukbi', 'reading'];
  if (!allowedTes.includes(tes)) {
    return res.status(400).json({ error: `Jenis tes tidak valid. Pilih: ${allowedTes.join(', ')}` });
  }

  const filePath = `data/soal-${tes}.json`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const headers = {
    'Authorization': `Bearer ${GITHUB_PAT}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    // Ambil SHA file lama (untuk update)
    let sha = null;
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) {
      const json = await getRes.json();
      sha = json.sha;
    }

    const newData = {
      tes,
      judul: judul || tes.toUpperCase(),
      durasiMenit: durasiMenit || 60,
      skorMaksimal: skorMaksimal || 100,
      soal: soal.map((s, i) => ({
        ...s,
        id: s.id || (i + 1)
      }))
    };

    const newContent = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');

    const putBody = {
      message: `[admin] Update soal ${tes} — ${soal.length} soal`,
      content: newContent,
      ...(sha && { sha })
    };

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const errData = await putRes.json();
      return res.status(putRes.status).json({ error: errData.message || `GitHub error ${putRes.status}` });
    }

    return res.status(200).json({
      success: true,
      message: `Berhasil menyimpan ${soal.length} soal untuk tes "${tes}".`,
      filePath
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
