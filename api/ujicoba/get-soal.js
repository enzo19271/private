// api/ujicoba/get-soal.js
// API khusus untuk mengambil soal tes — TERPISAH dari api/get-data.js
// Tidak tabrakan dengan endpoint utama.

export default async function handler(req, res) {
  const { tes } = req.query;

  if (!tes) {
    return res.status(400).json({ error: 'Parameter ?tes diperlukan. Contoh: ?tes=toefl' });
  }

  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!GITHUB_PAT || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Environment variable belum dikonfigurasi.' });
  }

  // Path file soal di repo: data/soal-{tes}.json
  const filePath = `data/soal-${tes}.json`;
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
      return res.status(404).json({ error: `Soal untuk tes "${tes}" belum tersedia.` });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `GitHub API error ${response.status}` });
    }

    const json = await response.json();
    const raw = Buffer.from(json.content, 'base64').toString('utf-8');
    const data = JSON.parse(raw);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
