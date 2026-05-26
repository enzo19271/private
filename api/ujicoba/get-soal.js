// api/ujicoba/get-soal.js
// API untuk mengambil soal tes dari GitHub repo
// Mendukung format soal baru: { nama, durasi, soal: [{id,kategori,teks,hint,opsi[],jawaban}] }

export default async function handler(req, res) {
  const { tes } = req.query;

  if (!tes) {
    return res.status(400).json({ error: 'Parameter ?tes diperlukan. Contoh: ?tes=toefl' });
  }

  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!GITHUB_PAT || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Environment variable belum dikonfigurasi.' });
  }

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

    // Normalisasi format: pastikan selalu {nama, durasi, soal:[{id,kategori,teks,hint,opsi[],jawaban(int)}]}
    const normalized = normalizeFormat(data, tes);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(normalized);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function normalizeFormat(data, tesKey) {
  const durasiDefault = { toefl: 3600, iq: 2700, ukbi: 4500, reading: 1800 };
  const namaDefault = { toefl: 'TOEFL', iq: 'Tes IQ', ukbi: 'UKBI', reading: 'Pemahaman Bacaan' };

  // Format baru: sudah punya nama, durasi, soal array dengan teks/opsi array/jawaban int
  if (data.nama && data.soal && Array.isArray(data.soal) && data.soal[0]?.teks !== undefined) {
    return data;
  }

  // Format lama: { tes, judul, durasiMenit, soal: [{pertanyaan, opsi:{A,B,C,D}, jawaban:"B"}] }
  if (data.soal && data.soal[0]?.pertanyaan !== undefined) {
    const letterToIdx = { A: 0, B: 1, C: 2, D: 3 };
    const soal = data.soal.map(s => ({
      id: s.id,
      kategori: s.kategori || 'Umum',
      teks: s.pertanyaan,
      hint: s.pembahasan || null,
      opsi: typeof s.opsi === 'object' && !Array.isArray(s.opsi)
        ? [s.opsi.A, s.opsi.B, s.opsi.C, s.opsi.D]
        : s.opsi,
      jawaban: typeof s.jawaban === 'string'
        ? (letterToIdx[s.jawaban.toUpperCase()] ?? 0)
        : s.jawaban
    }));

    return {
      nama: data.judul || namaDefault[tesKey] || tesKey.toUpperCase(),
      durasi: (data.durasiMenit || durasiDefault[tesKey] / 60) * 60,
      soal
    };
  }

  // Fallback: kembalikan data apa adanya
  return {
    nama: data.nama || namaDefault[tesKey] || tesKey,
    durasi: data.durasi || durasiDefault[tesKey] || 3600,
    soal: data.soal || []
  };
}
