// api/ujicoba/verify-admin.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const { ADMIN_KEY } = process.env;
  if (!ADMIN_KEY) {
    return res.status(500).json({ error: 'ADMIN_KEY belum dikonfigurasi.' });
  }

  // Baca dari body.key ATAU header x-admin-key (body lebih aman untuk karakter khusus)
  const key = req.body?.key || req.headers['x-admin-key'] || '';

  if (!key || key.trim() !== ADMIN_KEY.trim()) {
    await new Promise(r => setTimeout(r, 400));
    return res.status(403).json({ error: 'Admin key tidak valid.' });
  }

  return res.status(200).json({ ok: true });
}
