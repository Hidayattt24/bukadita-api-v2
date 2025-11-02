# 🚀 Panduan Deploy BUKADITA API ke Vercel

## 📋 Checklist Sebelum Deploy

### ✅ Persiapan File

- [x] `api/index.ts` - Serverless handler sudah benar
- [x] `vercel.json` - Konfigurasi routing
- [x] `package.json` - Script postinstall dan vercel-build
- [x] `.env.production` - Template environment variables
- [x] `.vercelignore` - Exclude unnecessary files

### ✅ Code Ready

- [x] Rate limiting sudah dihapus
- [x] CORS configuration flexible
- [x] Error handling proper
- [x] Health check endpoint ready

---

## 🔧 Langkah-langkah Deploy

### Step 1: Setup di Vercel Dashboard

1. **Buka Vercel Dashboard**
   - Login ke https://vercel.com
   - Klik "Add New Project"

2. **Import Repository**
   - Pilih repository `bukadita-api-v2`
   - Klik "Import"

3. **Configure Project**
   - Framework Preset: **Other**
   - Root Directory: `./` (default)
   - Build Command: `npm run vercel-build`
   - Output Directory: (kosongkan untuk serverless)
   - Install Command: `npm install`

### Step 2: Environment Variables

Tambahkan semua environment variables berikut di Vercel Dashboard:

**Settings → Environment Variables**

```bash
# Node Environment
NODE_ENV=production

# Supabase
SUPABASE_URL=https://fjbacahbbicjggdzmern.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYmFjYWhiYmljamdnZHptZXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTgxMTgsImV4cCI6MjA3NzU5NDExOH0.rZnLSehsQdykV-6Gz6n5QxJIilWo2kdxAVigKtljfIc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYmFjYWhiYmljamdnZHptZXJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxODExOCwiZXhwIjoyMDc3NTk0MTE4fQ.xy0UkC0nx47Jl7xbHrgAOB7uGss-vRSNajgZvlxOTAw

# Database (PENTING: Gunakan pooling!)
DATABASE_URL=postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres

# JWT
JWT_SECRET=bukadita_v2_super_secret_key_minimum_32_chars_long_change_in_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server
PORT=8080

# Frontend URLs (UPDATE SETELAH DEPLOY!)
ADMIN_URL=https://bukadita-admin-v2.vercel.app
USER_URL=https://bukadita-user-v2.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

**CATATAN PENTING:**

- Untuk setiap environment variable, pilih environment: **Production**, **Preview**, dan **Development**
- Klik "Add" setelah setiap entry

### Step 3: Deploy

1. **Trigger Deploy**
   - Klik "Deploy" di Vercel Dashboard
   - Atau push ke GitHub untuk auto-deploy

2. **Monitor Build Logs**

   ```
   Vercel Dashboard → Deployments → [Latest] → Building
   ```

   Pastikan tidak ada error di:
   - ✅ Installing dependencies
   - ✅ Building application
   - ✅ Prisma generate
   - ✅ TypeScript compile

3. **Tunggu Deployment Selesai**
   - Biasanya 2-3 menit
   - Status akan berubah menjadi "Ready"

### Step 4: Testing

1. **Test Health Check**

   ```bash
   curl https://bukadita-api-v2.vercel.app/health
   ```

   Expected response:

   ```json
   {
     "error": false,
     "code": "HEALTH_OK",
     "message": "Server is healthy",
     "data": {
       "uptime": 1.234,
       "timestamp": "2025-11-02T...",
       "environment": "production"
     }
   }
   ```

2. **Test API Endpoint**

   ```bash
   curl https://bukadita-api-v2.vercel.app/api/v1/modules
   ```

3. **Check Function Logs**
   ```
   Vercel Dashboard → Deployments → [Latest] → Functions
   ```

---

## ⚠️ Troubleshooting

### Error: 500 FUNCTION_INVOCATION_FAILED

**Penyebab:**

- Environment variables kurang
- Database connection failed
- Prisma Client tidak ter-generate

**Solusi:**

1. Cek Build Logs untuk error messages
2. Cek Function Logs untuk runtime errors
3. Verifikasi semua environment variables ada
4. Test DATABASE_URL di local:
   ```bash
   npx prisma db pull
   ```

### Error: "Cannot find module '@prisma/client'"

**Solusi:**

1. Pastikan `postinstall` script ada di package.json:

   ```json
   "postinstall": "prisma generate"
   ```

2. Atau manual di build command:
   ```bash
   prisma generate && npm run build
   ```

### Error: Database connection timeout

**Solusi:**

1. Gunakan connection pooling:

   ```
   ?pgbouncer=true&connection_limit=1
   ```

2. Cek Supabase pooler settings:
   - Mode: Transaction
   - Port: 6543 (bukan 5432)

### Error: CORS blocked

**Solusi:**

1. Update ADMIN_URL dan USER_URL di environment variables
2. Format harus exact (dengan https://, tanpa trailing slash)
3. Redeploy setelah update env vars

### Error: Function timeout

**Penyebab:**

- Vercel Free plan: 10 second timeout
- Query database terlalu lama

**Solusi:**

1. Optimize slow queries
2. Add database indexes
3. Consider Vercel Pro (60 second timeout)

---

## 🔄 Update & Redeploy

### Automatic Deployment

Vercel akan auto-deploy setiap kali ada push ke branch main:

```bash
git add .
git commit -m "update: description"
git push origin main
```

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Rollback Deployment

```
Vercel Dashboard → Deployments → [Previous] → ... → Promote to Production
```

---

## 📊 Monitoring

### Real-time Function Logs

```bash
# Install Vercel CLI
npm i -g vercel

# Stream logs
vercel logs --follow
```

### Check Deployment Status

```bash
vercel list
```

### Performance Monitoring

```
Vercel Dashboard → Analytics → Web Vitals
```

---

## 🔐 Security Checklist

- [ ] JWT_SECRET diganti dengan secret yang kuat (min 32 chars)
- [ ] DATABASE_URL menggunakan environment variable (tidak hardcode)
- [ ] CORS origins hanya allow frontend URLs yang valid
- [ ] Rate limiting aktif (kalau mau diaktifkan lagi)
- [ ] Supabase RLS policies configured
- [ ] No sensitive data in logs

---

## 📝 Post-Deployment

### 1. Update Frontend URLs

Setelah API deploy, update environment variables di frontend apps:

**bukadita-admin-v2:**

```env
NEXT_PUBLIC_API_URL=https://bukadita-api-v2.vercel.app/api/v1
```

**bukadita-user-v2:**

```env
NEXT_PUBLIC_API_URL=https://bukadita-api-v2.vercel.app/api/v1
```

### 2. Update CORS di Backend

Kalau frontend sudah deploy, update di Vercel environment variables:

```env
ADMIN_URL=https://bukadita-admin-v2.vercel.app
USER_URL=https://bukadita-user-v2.vercel.app
```

### 3. Test Integration

- [ ] Test login dari admin frontend
- [ ] Test CRUD operations
- [ ] Check error handling
- [ ] Verify CORS working
- [ ] Monitor function logs

---

## 🆘 Support

### Vercel Support

- Status: https://www.vercel-status.com/
- Docs: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions

### Database Support

- Supabase Docs: https://supabase.com/docs
- Dashboard: https://app.supabase.com

### API Issues

Check logs:

```bash
# Function logs
vercel logs [deployment-url]

# Build logs
Vercel Dashboard → Deployments → Build Logs
```

---

## ✅ Deployment Success Criteria

- [ ] Build completed without errors
- [ ] Health check returns 200 OK
- [ ] Database connection working
- [ ] API endpoints responding
- [ ] No 500 errors in function logs
- [ ] CORS working with frontend
- [ ] JWT authentication working
- [ ] Prisma queries executing successfully

---

**Last Updated:** November 2, 2025
**Status:** Ready for Deployment 🚀
