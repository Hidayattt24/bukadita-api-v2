# 🚀 Deploy Backend API ke Vercel - Step by Step

## ✅ Checklist Pre-Deployment

- [x] Build berhasil lokal (`npm run build`)
- [x] Test API lokal (`npm run dev`)
- [x] Database connection pooling sudah dikonfigurasi
- [x] File `api/index.ts` sudah benar
- [x] File `vercel.json` sudah dikonfigurasi
- [x] Environment variables siap

## 📋 Langkah Deployment

### 1. Persiapan Environment Variables

Sebelum deploy, siapkan semua environment variables ini:

```bash
# Node Environment
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://fjbacahbbicjggdzmern.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Database Connection (PENTING: Gunakan connection pooling!)
DATABASE_URL="postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=0"
DIRECT_URL="postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# JWT Configuration
JWT_SECRET=bukadita_v2_super_secret_key_minimum_32_chars_long_change_in_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend URLs for CORS (URL FRONTEND, bukan API!)
ADMIN_URL=https://admin-bukadita.vercel.app
USER_URL=https://bukadita-user-v2.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
PORT=8080
```

### 2. Deploy via Vercel CLI

```bash
# Install Vercel CLI (jika belum)
npm install -g vercel

# Login
vercel login

# Pindah ke folder API
cd "D:\....Bismillah Sempro\Bukadita REVISI\bukadita-api-v2"

# Deploy preview (untuk test)
vercel

# Jika preview OK, deploy production
vercel --prod
```

### 3. Set Environment Variables di Vercel

**Via Dashboard (Recommended):**

1. Buka https://vercel.com/dashboard
2. Pilih project **bukadita-api-v2** (atau nama yang Anda buat)
3. Settings → Environment Variables
4. Tambahkan satu per satu:

```bash
# Klik "Add New"
# Key: NODE_ENV
# Value: production
# Environment: Production, Preview, Development ✓✓✓
# Save

# Ulangi untuk semua variable di atas
```

**Via CLI:**

```bash
vercel env add NODE_ENV production
vercel env add SUPABASE_URL production
vercel env add DATABASE_URL production
# ... dan seterusnya
```

### 4. Redeploy Setelah Set Environment Variables

**PENTING:** Setelah menambah/mengubah environment variables, WAJIB redeploy!

```bash
vercel --prod
```

Atau via Dashboard:

- Deployments tab → Klik ••• → Redeploy

### 5. Test Deployment

**Test Health Check:**

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
    "uptime": 123.456,
    "timestamp": "2025-11-02T10:00:00.000Z",
    "environment": "production"
  }
}
```

**Test API Info:**

```bash
curl https://api-bukadita.vercel.app/api/v1
```

**Test Login:**

```bash
curl -X POST https://api-bukadita.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123"}'
```

## 🔍 Troubleshooting

### Error: 404 Not Found

**Penyebab:**

- Route tidak dikonfigurasi dengan benar di `vercel.json`
- Endpoint path salah

**Solusi:**

```bash
# Check vercel.json
cat vercel.json

# Harus ada routes:
{
  "routes": [
    { "src": "/health", "dest": "api/index.ts" },
    { "src": "/api/v1/(.*)", "dest": "api/index.ts" },
    { "src": "/(.*)", "dest": "api/index.ts" }
  ]
}
```

### Error: 500 Internal Server Error

**Check Logs:**

```bash
# Via CLI
vercel logs api-bukadita --follow

# Atau via Dashboard
# Project → Deployments → View Function Logs
```

**Common Issues:**

1. **Database connection gagal**
   - Check `DATABASE_URL` format
   - Pastikan connection pooling enabled
   - Check Supabase database status

2. **Prisma Client error**

   ```bash
   # Pastikan ada di package.json:
   "postinstall": "prisma generate"

   # Redeploy
   vercel --prod
   ```

3. **Environment variables tidak terbaca**
   - Check spelling (case-sensitive!)
   - Pastikan sudah di-set di Vercel
   - Redeploy setelah set env vars

### Error: CORS Policy

**Jika masih CORS error setelah deploy:**

1. **Check environment variables di Vercel:**

   ```bash
   ADMIN_URL=https://admin-bukadita.vercel.app  # BUKAN URL API!
   USER_URL=https://bukadita-user-v2.vercel.app
   ```

2. **Redeploy backend:**

   ```bash
   vercel --prod
   ```

3. **Clear browser cache:**
   - Chrome: Ctrl + Shift + Del
   - Hard reload: Ctrl + Shift + R

### Error: Function Timeout (10s)

**Jika query database lambat:**

1. **Optimize database queries**

   ```typescript
   // ❌ Fetch semua data
   const modules = await prisma.module.findMany({
     include: { subMateri: true },
   });

   // ✅ Fetch only needed
   const modules = await prisma.module.findMany({
     select: { id: true, title: true },
   });
   ```

2. **Add database indexes**

   ```sql
   CREATE INDEX idx_module_id ON sub_materis(module_id);
   CREATE INDEX idx_user_id ON progress(user_id);
   ```

3. **Upgrade to Pro plan** (60s timeout)

## 📊 Monitoring

### Vercel Dashboard

**Check:**

- Deployment status
- Function invocations
- Error rate
- Response time (P50, P95, P99)
- Cold start frequency

### Key Metrics

**Good Performance:**

- ✅ P50 latency: <500ms (warm start)
- ✅ P95 latency: <2s (includes cold starts)
- ✅ Error rate: <1%
- ✅ Cold start rate: <10%

**Needs Optimization:**

- ⚠️ P50 latency: >1s
- ⚠️ P95 latency: >5s
- ⚠️ Error rate: >5%
- ⚠️ Cold start rate: >20%

## 🔄 Update Deployment

**Setiap kali ada perubahan code:**

```bash
# 1. Test lokal
npm run dev
# Test endpoints

# 2. Build
npm run build
# Pastikan no error

# 3. Commit changes
git add .
git commit -m "Update API endpoints"

# 4. Deploy
vercel --prod
```

**Jika hanya update environment variables:**

```bash
# 1. Update di Vercel Dashboard
# Settings → Environment Variables → Edit

# 2. Redeploy
vercel --prod
```

## 🎯 Struktur URL Deployment

**Format URL:**

```
Production:  https://api-bukadita.vercel.app
Preview:     https://api-bukadita-[hash].vercel.app
Development: http://localhost:8080
```

**Endpoints:**

```
Health:      GET  /health
API Info:    GET  /api/v1
Auth Login:  POST /api/v1/auth/login
Modules:     GET  /api/v1/modules
Progress:    GET  /api/v1/progress/modules
```

**Full URL Examples:**

```bash
# Health check
https://api-bukadita.vercel.app/health

# Login
https://api-bukadita.vercel.app/api/v1/auth/login

# Get modules
https://api-bukadita.vercel.app/api/v1/modules

# Get progress (requires auth)
https://api-bukadita.vercel.app/api/v1/progress/modules
```

## ✅ Post-Deployment Checklist

- [ ] Health endpoint returns 200 OK
- [ ] API info endpoint shows correct version
- [ ] Login endpoint works (test dengan Postman)
- [ ] Protected endpoints require JWT
- [ ] CORS working dengan frontend
- [ ] Database queries berjalan normal
- [ ] No errors di Vercel logs
- [ ] Response time acceptable (<2s P95)

## 🔐 Security Reminder

- ✅ Environment variables tidak di-commit ke git
- ✅ JWT_SECRET kuat (min 32 chars)
- ✅ CORS hanya whitelist domain yang diizinkan
- ✅ Rate limiting enabled (optional)
- ✅ Helmet security headers enabled
- ✅ Database connection pooling configured

## 📞 Need Help?

**Check:**

1. Vercel logs untuk error details
2. Browser console untuk CORS issues
3. Network tab untuk request/response
4. Database logs di Supabase

**Resources:**

- Vercel Docs: https://vercel.com/docs
- Prisma Docs: https://www.prisma.io/docs
- Supabase Docs: https://supabase.com/docs

---

**Status:** Ready to Deploy! 🚀
**Last Updated:** 2 November 2025
