// api/ujicoba/verify-admin.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const { ADMIN_KEY } = process.env;

  if (!ADMIN_KEY) {
    return res.status(500).json({ error: 'ADMIN_KEY belum dikonfigurasi.' });
  }

  const key = req.headers['x-admin-key'];

  if (!key || key !== ADMIN_KEY) {
    await new Promise(r => setTimeout(r, 400));
    return res.status(403).json({ error: 'Admin key tidak valid.' });
  }

  return res.status(200).json({ ok: true });
}
