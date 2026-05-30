# Academy Eji – Admin Key Gate

## Cara Setup di Vercel

### 1. Tambah Environment Variable
Di dashboard Vercel:
```
Project → Settings → Environment Variables
```
Tambahkan:
| Name | Value |
|------|-------|
| `ADMIN_KEY` | kunci rahasiamu (contoh: `AcademyEji@2025!`) |

Centang ketiga environment: **Production**, **Preview**, **Development**.

---

### 2. Deploy ke Vercel
Push ke GitHub seperti biasa — Vercel otomatis deploy.

```bash
git add .
git commit -m "feat: tambah admin key gate via middleware"
git push
```

---

### 3. Halaman yang Diproteksi
| Halaman | Path |
|---------|------|
| Admin Panel | `/admin.html` |
| Analitik Traffic | `/analytics.html` |
| Konfigurasi | `/config.html` |

---

### Cara Kerja
1. User buka `/admin.html` → middleware Vercel berjalan di edge
2. Cek cookie sesi → jika ada dan valid, langsung masuk
3. Jika tidak ada → tampilkan halaman login
4. User input kunci → jika benar, cookie sesi di-set (8 jam)
5. Kunci **tidak pernah** ada di source code HTML

---

### Mengganti Kunci
Cukup ubah value `ADMIN_KEY` di Vercel dashboard, lalu redeploy.
Tidak perlu edit kode apapun.

---

### File yang Ditambahkan
```
middleware.js     ← logika proteksi (Vercel Edge Middleware)
vercel.json       ← konfigurasi Vercel
package.json      ← dependency Next.js untuk middleware
```
