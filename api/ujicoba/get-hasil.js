// api/ujicoba/get-hasil.js
// Ambil data hasil tes untuk leaderboard dari data/hasil-tes.json di GitHub repo

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { tes } = req.query; // opsional — kalau ada, filter by jenis tes

  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!GITHUB_PAT || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Environment variable belum dikonfigurasi.' });
  }

  const filePath = 'data/hasil-tes.json';
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_PAT}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (response.status === 404) {
      // File belum ada — kembalikan array kosong
      return res.status(200).json({ hasil: [] });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `GitHub API error ${response.status}` });
    }

    const json = await response.json();
    const raw = Buffer.from(json.content, 'base64').toString('utf-8');
    let data = JSON.parse(raw);

    // Filter by jenis tes kalau ada param
    if (tes) {
      data = data.filter(item => item.tesKey === tes);
    }

    // Sort by skor tertinggi, lalu waktu tercepat
    data.sort((a, b) => {
      if (b.skorPersen !== a.skorPersen) return b.skorPersen - a.skorPersen;
      return (a.waktuDipakai || 9999) - (b.waktuDipakai || 9999);
    });

    // Ambil top 20 per tes
    const top = data.slice(0, 20);

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    return res.status(200).json({ hasil: top });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
