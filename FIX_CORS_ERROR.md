# 🔧 Cara Memperbaiki CORS Error

## ❌ Error yang Muncul

```
Access to fetch at 'https://api-bukadita.vercel.app/auth/login'
from origin 'https://admin-bukadita.vercel.app'
has been blocked by CORS policy: Response to preflight request doesn't pass
access control check: No 'Access-Control-Allow-Origin' header is present on
the requested resource.
```

## 🎯 Penyebab

Environment variable **SALAH** di backend API:

**❌ SALAH:**

```bash
ADMIN_URL=https://api-bukadita.vercel.app/auth/login  # Ini URL API, bukan frontend!
```

**✅ BENAR:**

```bash
ADMIN_URL=https://admin-bukadita.vercel.app  # URL frontend admin
```

## 🔧 Langkah Perbaikan

### 1. Update Environment Variables di Vercel

**API Backend (bukadita-api-v2):**

1. Buka dashboard Vercel: https://vercel.com/dashboard
2. Pilih project **bukadita-api-v2**
3. Masuk ke **Settings** → **Environment Variables**
4. Update/Edit variable berikut:

```bash
# ✅ URL Frontend Admin (tempat admin login)
ADMIN_URL=https://admin-bukadita.vercel.app

# ✅ URL Frontend User (tempat user akses)
USER_URL=https://bukadita-user-v2.vercel.app
```

5. **PENTING:** Pilih environment: **Production, Preview, Development** (centang semua)

### 2. Redeploy API Backend

Setelah update environment variables, **WAJIB REDEPLOY**:

```bash
cd "D:\....Bismillah Sempro\Bukadita REVISI\bukadita-api-v2"
vercel --prod
```

Atau via Dashboard:

1. Masuk ke project bukadita-api-v2
2. Tab **Deployments**
3. Klik tiga titik (•••) di deployment terakhir
4. Pilih **Redeploy**

### 3. Verifikasi CORS Settings di Code

Pastikan file CORS configuration sudah benar. Check file `src/app.ts` atau `src/server.ts`:

```typescript
import cors from "cors";

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000", // Local admin
  "http://localhost:3001", // Local user
  process.env.ADMIN_URL, // Production admin
  process.env.USER_URL, // Production user
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
```

### 4. Test Setelah Deploy

1. **Clear Browser Cache:**
   - Chrome: Ctrl + Shift + Del
   - Pilih "Cached images and files"
   - Clear data

2. **Hard Reload:**
   - Chrome: Ctrl + Shift + R
   - Atau Ctrl + F5

3. **Test Login:**
   - Buka https://admin-bukadita.vercel.app
   - Coba login
   - Check console (F12) untuk error

## 📋 Checklist Environment Variables

### API Backend (bukadita-api-v2)

```bash
# ✅ Node Environment
NODE_ENV=production

# ✅ Supabase
SUPABASE_URL=https://fjbacahbbicjggdzmern.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ✅ Database
DATABASE_URL="postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=0"
DIRECT_URL="postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# ✅ JWT
JWT_SECRET=bukadita_v2_super_secret_key_minimum_32_chars_long_change_in_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ✅ CORS - URL FRONTEND (PENTING!)
ADMIN_URL=https://admin-bukadita.vercel.app
USER_URL=https://bukadita-user-v2.vercel.app

# ✅ Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ✅ Logging
LOG_LEVEL=info
PORT=8080
```

### Admin Frontend (bukadita-admin-v2)

```bash
# ✅ API Backend URL
NEXT_PUBLIC_API_URL=https://api-bukadita.vercel.app

# ✅ Supabase (untuk frontend)
NEXT_PUBLIC_SUPABASE_URL=https://fjbacahbbicjggdzmern.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# ✅ App Info
NEXT_PUBLIC_APP_NAME=Bukadita Admin
NEXT_PUBLIC_APP_URL=https://admin-bukadita.vercel.app
```

### User Frontend (bukadita-user-v2)

```bash
# ✅ API Backend URL
NEXT_PUBLIC_API_URL=https://api-bukadita.vercel.app

# ✅ Supabase (untuk frontend)
NEXT_PUBLIC_SUPABASE_URL=https://fjbacahbbicjggdzmern.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# ✅ App Info
NEXT_PUBLIC_APP_NAME=Bukadita
NEXT_PUBLIC_APP_URL=https://bukadita-user-v2.vercel.app
```

## 🔍 Debug CORS Issues

### 1. Check CORS Headers di Browser

Buka DevTools (F12) → Network Tab → Pilih request yang error → Check Headers:

**Response Headers yang HARUS ADA:**

```
Access-Control-Allow-Origin: https://admin-bukadita.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

### 2. Test API Langsung

```bash
# Test dengan curl
curl -X OPTIONS https://api-bukadita.vercel.app/auth/login \
  -H "Origin: https://admin-bukadita.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Harus return status 200 atau 204 dengan CORS headers.

### 3. Check Vercel Logs

```bash
# Via CLI
vercel logs api-bukadita

# Atau via Dashboard
# Project → Deployments → View Function Logs
```

## 🚨 Common Mistakes

### ❌ Kesalahan Umum:

1. **ADMIN_URL isi URL API:**

   ```bash
   ADMIN_URL=https://api-bukadita.vercel.app  # ❌ SALAH!
   ```

2. **Lupa /auth/login di ADMIN_URL:**

   ```bash
   ADMIN_URL=https://admin-bukadita.vercel.app/auth/login  # ❌ SALAH!
   ```

3. **Typo di domain:**

   ```bash
   ADMIN_URL=https://admin-bukadita.vercel.app  # ✅ BENAR
   ADMIN_URL=https://bukadita-admin.vercel.app  # ❌ SALAH (typo)
   ```

4. **Lupa redeploy setelah update env:**
   - Update env ✅
   - Lupa redeploy ❌
   - CORS masih error! ❌

### ✅ Yang Benar:

```bash
# Backend API environment variables
ADMIN_URL=https://admin-bukadita.vercel.app     # Domain frontend admin
USER_URL=https://bukadita-user-v2.vercel.app    # Domain frontend user

# Frontend environment variables
NEXT_PUBLIC_API_URL=https://api-bukadita.vercel.app  # Domain backend API
```

## 📞 Still Having Issues?

1. **Double check domain names** - pastikan tidak ada typo
2. **Clear browser cache** - hard reload (Ctrl + Shift + R)
3. **Check Vercel logs** - lihat error messages
4. **Verify env vars** - pastikan semua env sudah di-set
5. **Redeploy** - deploy ulang backend dan frontend

---

**Key Points:**

- ✅ `ADMIN_URL` = URL frontend admin (https://admin-bukadita.vercel.app)
- ✅ `USER_URL` = URL frontend user (https://bukadita-user-v2.vercel.app)
- ✅ `NEXT_PUBLIC_API_URL` = URL backend API (https://api-bukadita.vercel.app)
- ✅ **WAJIB REDEPLOY** setelah update environment variables!

**Last Updated:** 2 November 2025
