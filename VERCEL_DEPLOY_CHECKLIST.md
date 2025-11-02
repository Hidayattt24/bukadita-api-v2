# ✅ Vercel Deploy Checklist - BUKADITA API

## 🎯 Status: READY TO DEPLOY

### ✅ Konfigurasi yang Sudah Diperbaiki

1. **package.json** ✅
   - `postinstall: "prisma generate"` - Auto-generate Prisma Client
   - `vercel-build: "prisma generate && tsc"` - Build tanpa migrate (database sudah ada)
   - Build tested successfully ✅

2. **api/index.ts** ✅
   - Serverless handler dengan Promise wrapper
   - Error handling proper
   - Kompatibel dengan Vercel Request/Response

3. **vercel.json** ✅
   - Routes configured: `/health`, `/api/v1/(.*)`
   - Region: `sin1` (Singapore - dekat database)
   - Function timeout: 10s (Free plan limit)
   - Memory: 1024MB

4. **.env.production** ✅
   - DATABASE_URL dengan `pgbouncer=true&connection_limit=1&pool_timeout=0`
   - Semua environment variables lengkap

5. **Tidak Ada Konflik** ✅
   - ❌ No `now.json`
   - ❌ No `.now` directory
   - ❌ No `.nowignore`
   - ❌ No `NOW_` prefix env vars

---

## 🚀 Cara Deploy ke Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Login & Import
1. Buka https://vercel.com
2. Login dengan GitHub account
3. Klik **"Add New Project"**
4. Pilih repository **bukadita-api-v2**
5. Klik **"Import"**

#### Step 2: Configure Build Settings
```
Framework Preset: Other
Root Directory: ./
Build Command: npm run vercel-build
Output Directory: (kosongkan)
Install Command: npm install
Node.js Version: 18.x atau 20.x
```

#### Step 3: Environment Variables
Tambahkan semua ini di **Settings → Environment Variables**:

**CRITICAL (Wajib):**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=0
DIRECT_URL=postgresql://postgres.fjbacahbbicjggdzmern:bismillahbukadita@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
JWT_SECRET=bukadita_v2_super_secret_key_minimum_32_chars_long_change_in_production
```

**Supabase:**
```bash
SUPABASE_URL=https://fjbacahbbicjggdzmern.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYmFjYWhiYmljamdnZHptZXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTgxMTgsImV4cCI6MjA3NzU5NDExOH0.rZnLSehsQdykV-6Gz6n5QxJIilWo2kdxAVigKtljfIc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYmFjYWhiYmljamdnZHptZXJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxODExOCwiZXhwIjoyMDc3NTk0MTE4fQ.xy0UkC0nx47Jl7xbHrgAOB7uGss-vRSNajgZvlxOTAw
```

**JWT Config:**
```bash
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

**CORS (Update setelah frontend deploy):**
```bash
ADMIN_URL=https://bukadita-admin-v2.vercel.app
USER_URL=https://bukadita-user-v2.vercel.app
```

**Optional:**
```bash
PORT=8080
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Untuk setiap variable:** Centang **Production**, **Preview**, **Development**

#### Step 4: Deploy
1. Klik **"Deploy"**
2. Tunggu 2-3 menit
3. Status akan menjadi **"Ready"** ✅

---

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd "d:\....Bismillah Sempro\Bukadita REVISI\bukadita-api-v2"
vercel --prod

# Follow prompts untuk setup environment variables
```

---

## 🧪 Testing Setelah Deploy

### 1. Health Check
```bash
curl https://bukadita-api-v2.vercel.app/health
```

**Expected Response:**
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

### 2. Modules Endpoint
```bash
curl https://bukadita-api-v2.vercel.app/api/v1/modules
```

### 3. Auth Test (Register)
```bash
curl -X POST https://bukadita-api-v2.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "full_name": "Test User",
    "phone": "+6281234567890",
    "password": "Test123456"
  }'
```

---

## 🔍 Monitoring & Debugging

### Check Build Logs
```
Vercel Dashboard → Deployments → [Latest] → Building
```

Pastikan:
- ✅ Dependencies installed
- ✅ Prisma Client generated
- ✅ TypeScript compiled
- ✅ No errors

### Check Function Logs
```
Vercel Dashboard → Deployments → [Latest] → Functions → View logs
```

### Real-time Logs (CLI)
```bash
vercel logs --follow
```

---

## 📊 Struktur Endpoint API

### Health Check
```
GET /health
```

### Public Endpoints
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/modules
GET  /api/v1/modules/:id
```

### Protected Endpoints (Require JWT)
```
# User Progress
GET    /api/v1/progress/modules
GET    /api/v1/progress/modules/:moduleId
POST   /api/v1/progress/modules/:moduleId
POST   /api/v1/progress/sub-materials/:subMateriId

# Quizzes
GET    /api/v1/quizzes/:moduleId
POST   /api/v1/quizzes/:quizId/submit

# Notes
GET    /api/v1/notes
POST   /api/v1/notes
PUT    /api/v1/notes/:id
DELETE /api/v1/notes/:id

# User Profile
GET    /api/v1/users/profile
PUT    /api/v1/users/profile
```

### Admin Endpoints (Require admin/superadmin role)
```
# Module Management
POST   /api/v1/admin/modules
PUT    /api/v1/admin/modules/:id
DELETE /api/v1/admin/modules/:id

# Quiz Management
GET    /api/v1/admin/quizzes
POST   /api/v1/admin/quizzes
PUT    /api/v1/admin/quizzes/:id
DELETE /api/v1/admin/quizzes/:id

# User Management
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
PUT    /api/v1/admin/users/:id/role
DELETE /api/v1/admin/users/:id
```

---

## ⚠️ Troubleshooting

### Error: 500 FUNCTION_INVOCATION_FAILED

**Check:**
1. Environment variables lengkap? ✅
2. DATABASE_URL format benar? ✅
3. Prisma Client ter-generate? ✅
4. Function logs untuk error detail

**Solutions:**
```bash
# Check logs
vercel logs [deployment-url]

# Redeploy
vercel --prod --force
```

### Error: Database Connection Timeout

**Fix DATABASE_URL:**
```
postgresql://...?pgbouncer=true&connection_limit=1&pool_timeout=0
```

**Vercel Serverless Requirements:**
- ✅ Connection pooling (pgbouncer=true)
- ✅ Connection limit = 1 per function
- ✅ Pool timeout = 0 (immediate)

### Error: CORS Blocked

**Update Environment Variables:**
1. Set ADMIN_URL = `https://your-admin.vercel.app`
2. Set USER_URL = `https://your-user.vercel.app`
3. **No trailing slash!**
4. Redeploy

### Error: Cannot find module '@prisma/client'

**Fix:**
```bash
# Make sure package.json has:
"postinstall": "prisma generate"

# Redeploy
```

---

## 📝 Post-Deployment Tasks

### 1. Get API URL
```
https://bukadita-api-v2.vercel.app
```

### 2. Update Frontend .env
**bukadita-admin-v2:**
```env
NEXT_PUBLIC_API_URL=https://bukadita-api-v2.vercel.app/api/v1
```

**bukadita-user-v2:**
```env
NEXT_PUBLIC_API_URL=https://bukadita-api-v2.vercel.app/api/v1
```

### 3. Update Backend CORS
Setelah frontend deploy, update di Vercel:
```env
ADMIN_URL=https://bukadita-admin-v2.vercel.app
USER_URL=https://bukadita-user-v2.vercel.app
```

### 4. Test Full Integration
- [ ] Login from admin frontend
- [ ] Login from user frontend
- [ ] CRUD operations
- [ ] Quiz submission
- [ ] Progress tracking
- [ ] File uploads (if any)

---

## 🔐 Security Notes

### ⚠️ IMPORTANT - Sebelum Production:

1. **Ganti JWT_SECRET** dengan random string (min 32 chars)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Aktifkan RLS di Supabase** untuk semua tabel sensitive

3. **Rate Limiting** - Pertimbangkan aktifkan kembali jika needed

4. **HTTPS Only** - Vercel sudah auto HTTPS ✅

5. **Environment Variables** - Never commit to git ✅

---

## 📞 Support

### Vercel Issues
- Status: https://www.vercel-status.com/
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

### Database Issues
- Supabase Dashboard: https://app.supabase.com
- Check connection pooler status
- Check database logs

### API Issues
```bash
# Check function logs
vercel logs [deployment-url] --follow

# Check build logs
Vercel Dashboard → Deployments → Build Logs
```

---

## ✅ Final Checklist

- [x] `npm run vercel-build` works locally
- [x] No conflicting configuration files
- [x] Environment variables prepared
- [x] DATABASE_URL has connection pooling
- [ ] Deployed to Vercel
- [ ] Health check returns 200
- [ ] Test API endpoints
- [ ] Frontend connected
- [ ] CORS configured
- [ ] Full integration tested

---

**Status:** SIAP DEPLOY 🚀  
**Last Updated:** November 2, 2025  
**Build Status:** ✅ SUCCESS  
**Configuration:** ✅ VALID  

**Next Step:** Deploy via Vercel Dashboard atau CLI
