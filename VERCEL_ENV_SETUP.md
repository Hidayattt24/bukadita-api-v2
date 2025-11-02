# ⚙️ Panduan Setup Environment Variables di Vercel (API Backend)

## 🔴 URGENT: Tambahkan Environment Variable yang Hilang

### **Missing Variable: USER_URL**

Anda perlu menambahkan variable `USER_URL` untuk mengatasi CORS error pada frontend user.

---

## 📋 Langkah-Langkah Menambahkan USER_URL

### **1. Buka Vercel Dashboard**

- Pergi ke: https://vercel.com/dashboard
- Pilih project: **bukadita-api-v2**

### **2. Masuk ke Settings → Environment Variables**

- Klik tab **Settings** (di menu atas)
- Klik **Environment Variables** (menu samping kiri)

### **3. Tambahkan USER_URL**

Klik **"Add New"** dan masukkan:

```
Key: USER_URL
Value: https://bukadita-user-v2.vercel.app
Environments: ✅ Production ✅ Preview ✅ Development
```

**Klik "Save"**

### **4. (Opsional) Update ADMIN_URL**

Jika ADMIN_URL masih berisi value yang di-mask (`•••••••••••••••`), pastikan isinya adalah:

```
Key: ADMIN_URL
Value: https://bukadita-admin-v2.vercel.app
Environments: ✅ Production ✅ Preview ✅ Development
```

---

## ✅ Daftar Lengkap Environment Variables yang Harus Ada

Berikut adalah **checklist lengkap** environment variables untuk API backend:

### **🔐 Authentication & Security**

- [x] `JWT_SECRET` → (your secret key - minimum 32 characters)
- [x] `JWT_ACCESS_EXPIRY` → `15m`
- [x] `JWT_REFRESH_EXPIRY` → `7d`

### **🗄️ Database (Supabase)**

- [x] `SUPABASE_URL` → `https://fjbacahbbicjggdzmern.supabase.co`
- [x] `SUPABASE_ANON_KEY` → (your anon key)
- [x] `SUPABASE_SERVICE_ROLE_KEY` → (your service role key)
- [ ] `DATABASE_URL` → **TAMBAHKAN INI JUGA!** (Connection pooling URL)

### **🌐 CORS Frontend URLs**

- [x] `ADMIN_URL` → `https://bukadita-admin-v2.vercel.app`
- [ ] `USER_URL` → **HARUS DITAMBAHKAN!** → `https://bukadita-user-v2.vercel.app`

### **⚙️ Server Configuration**

- [x] `PORT` → `8080`
- [x] `NODE_ENV` → `production`

### **🛡️ Rate Limiting**

- [x] `RATE_LIMIT_WINDOW_MS` → `900000`
- [x] `RATE_LIMIT_MAX_REQUESTS` → `100`

### **📊 Logging**

- [x] `LOG_LEVEL` → `info`

---

## 🚨 Environment Variables yang WAJIB Ditambahkan

### **1. USER_URL** (PALING PENTING)

```
USER_URL=https://bukadita-user-v2.vercel.app
```

**Alasan**: Untuk mengizinkan CORS request dari frontend user production.

### **2. DATABASE_URL** (Recommended)

```
DATABASE_URL=postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Alasan**: Prisma membutuhkan connection pooling URL untuk production.

### **3. DIRECT_URL** (Opsional - untuk migrations)

```
DIRECT_URL=postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

---

## 🔄 Setelah Menambahkan Environment Variables

### **WAJIB: Redeploy API**

Setelah menambahkan environment variables baru, Anda **HARUS** redeploy agar perubahan berlaku:

1. **Cara 1: Via Vercel Dashboard**
   - Pergi ke tab **Deployments**
   - Klik titik 3 (⋮) pada deployment terakhir
   - Klik **"Redeploy"**
   - Pilih **"Rebuild without cache"** (recommended)

2. **Cara 2: Via Terminal (jika sudah di git)**
   ```powershell
   cd "d:\....Bismillah Sempro\Bukadita REVISI\bukadita-api-v2"
   git add .
   git commit -m "fix: Update CORS configuration"
   git push origin main
   ```
   Vercel akan auto-redeploy.

---

## 🧪 Testing Setelah Deploy

### **1. Test API Health**

```bash
curl https://api-bukadita.vercel.app/health
```

**Expected Response:**

```json
{
  "error": false,
  "code": "HEALTH_OK",
  "message": "Server is healthy",
  "data": {
    "uptime": 123.45,
    "timestamp": "2025-11-03T...",
    "environment": "production"
  }
}
```

### **2. Test CORS dari Frontend User**

Buka frontend user: `https://bukadita-user-v2.vercel.app/login`

Coba login dengan credentials test:

- Email: `test@example.com`
- Password: `password123`

**Jika berhasil**: Login akan sukses tanpa CORS error.
**Jika masih error**: Check console browser untuk error detail.

---

## 🐛 Troubleshooting

### **Error: "No 'Access-Control-Allow-Origin' header"**

**Penyebab**: Environment variable `USER_URL` belum diset atau salah.

**Solusi**:

1. Verifikasi `USER_URL` sudah ditambahkan dengan value yang benar:
   ```
   https://bukadita-user-v2.vercel.app
   ```
2. Pastikan **TIDAK ADA** trailing slash di akhir URL
3. Pastikan environment dipilih: Production, Preview, Development
4. **REDEPLOY** setelah menambahkan

### **Error: "Failed to fetch"**

**Penyebab**: API backend mungkin tidak running atau URL salah.

**Solusi**:

1. Check API health: `https://api-bukadita.vercel.app/health`
2. Pastikan deployment sukses (hijau) di Vercel dashboard
3. Check Runtime Logs di Vercel untuk error

### **Error: "Origin not allowed by CORS"**

**Penyebab**: URL frontend tidak match dengan yang ada di `USER_URL`.

**Solusi**:

1. Pastikan URL persis sama (case-sensitive)
2. Jangan tambahkan trailing slash (`/`) di akhir
3. Gunakan HTTPS untuk production URL
4. Check logs di Vercel untuk melihat origin yang di-block

---

## 📝 Template untuk Copy-Paste ke Vercel

Berikut adalah template yang bisa langsung di-copy untuk ditambahkan di Vercel:

### **USER_URL**

```
https://bukadita-user-v2.vercel.app
```

### **DATABASE_URL** (jika belum ada)

```
postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### **DIRECT_URL** (opsional)

```
postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

---

## ✅ Checklist Post-Setup

Setelah menambahkan environment variables:

- [ ] `USER_URL` sudah ditambahkan di Vercel
- [ ] `DATABASE_URL` sudah ditambahkan (jika perlu)
- [ ] Sudah **Redeploy** API backend
- [ ] Deployment sukses (status hijau)
- [ ] Test `/health` endpoint → response OK
- [ ] Test login di frontend user → no CORS error
- [ ] Test di browser console → no error merah

---

## 🎯 Summary

**Yang Harus Dilakukan SEKARANG:**

1. ✅ Tambahkan `USER_URL=https://bukadita-user-v2.vercel.app` di Vercel
2. ✅ Tambahkan `DATABASE_URL` (connection string Supabase)
3. ✅ **REDEPLOY** API backend
4. ✅ Test login di frontend user

Setelah langkah-langkah di atas, CORS error akan hilang dan frontend bisa communicate dengan backend dengan normal! 🚀
