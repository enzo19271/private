// File: api/viewed.js

export default async function handler(req, res) {
  // 1. Amankan API agar hanya menerima method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metode tidak diizinkan. Gunakan POST.' });
  }

  try {
    // 2. Tangkap ID artikel yang dikirim dari Frontend
    const { article_id } = req.body;

    if (!article_id) {
      return res.status(400).json({ success: false, message: 'ID Artikel (article_id) wajib diisi.' });
    }

    // 3. LOGIKA DATABASE KAMU DI SINI
    // Di bawah ini adalah visualisasi bagaimana backend berinteraksi dengan DB:
    /*
       const { data, error } = await database
         .from('articles')
         .select('views')
         .eq('id', article_id)
         .single();
         
       const newViews = data.views + 1;
       
       await database
         .from('articles')
         .update({ views: newViews })
         .eq('id', article_id);
    */

    // 4. Beri respon sukses ke Frontend
    return res.status(200).json({ 
      success: true, 
      message: `Berhasil menambah tayangan untuk artikel ${article_id}` 
    });

  } catch (error) {
    // Tangani jika ada error pada server
    return res.status(500).json({ success: false, error: error.message });
  }
}
