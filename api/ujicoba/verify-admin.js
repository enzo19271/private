// api/ujicoba/verify-admin.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const { ADMIN_KEY } = process.env;
  if (!ADMIN_KEY) {
    return res.status(500).json({ error: 'ADMIN_KEY belum dikonfigurasi di environment Vercel.' });
  }

  // Ikuti pola persis save-soal.js yang sudah terbukti bekerja
  const key = req.headers['x-admin-key'] || req.body?.key || '';

  // Debug: kembalikan info (hapus setelah confirmed bekerja)
  if (key !== ADMIN_KEY) {
    return res.status(403).json({
      error: 'Admin key tidak valid.',
      debug_received_length: key.length,
      debug_env_length: ADMIN_KEY.length,
      debug_match: key === ADMIN_KEY
    });
  }

  return res.status(200).json({ ok: true });
}
