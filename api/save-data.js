// api/save-data.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { kategori, artikel, _sha } = req.body;
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_PATH, GITHUB_PAT } = process.env;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH||'data.json'}`;
  const content = Buffer.from(JSON.stringify({ kategori, artikel }, null, 2)).toString('base64');
  const body = { message: 'Update data.json via admin', content };
  if (_sha) body.sha = _sha;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${GITHUB_PAT}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) return res.status(r.status).json({ message: 'GitHub error '+r.status });
  const j = await r.json();
  res.json({ sha: j.content.sha });
}
