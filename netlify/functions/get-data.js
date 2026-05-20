// Netlify Function — PAT aman di server, tidak kelihatan pengunjung
exports.handler = async () => {
  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO, GITHUB_PATH } = process.env;

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH || 'data.json'}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  if (!res.ok) return { statusCode: res.status, body: 'Gagal ambil data' };

  const json = await res.json();
  const data = JSON.parse(Buffer.from(json.content, 'base64').toString());

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};
