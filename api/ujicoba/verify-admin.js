// api/ujicoba/verify-admin.js
// Endpoint untuk memverifikasi admin key sebelum membuka halaman admin

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan POST.' });
  }

  const { ADMIN_KEY } = process.env;

  if (!ADMIN_KEY) {
    return res.status(500).json({ error: 'ADMIN_KEY belum dikonfigurasi di environment variable.' });
  }

  const authHeader = req.headers['x-admin-key'];

  if (!authHeader || authHeader !== ADMIN_KEY) {
    // Tambahkan delay kecil untuk mencegah brute-force
    await new Promise(r => setTimeout(r, 500));
    return res.status(403).json({ error: 'Admin key tidak valid.' });
  }

  return res.status(200).json({ ok: true, message: 'Autentikasi berhasil.' });
}
