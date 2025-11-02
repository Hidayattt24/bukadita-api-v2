# 🔧 Vercel Deployment Troubleshooting

## ❌ Error: 500 FUNCTION_INVOCATION_FAILED

### Penyebab Umum:
1. Environment variables tidak lengkap
2. Database connection gagal
3. Prisma Client tidak ter-generate
4. Module import error
5. Serverless function timeout

---

## ✅ Solusi yang Sudah Diterapkan:

### 1. Update `api/index.ts`
File sudah diupdate untuk menggunakan Vercel handler yang benar:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from "dotenv";
dotenv.config();
import app from "../src/app";

export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
```

### 2. Install `@vercel/node`
Dependency sudah ditambahkan di `package.json`:
```json
"@vercel/node": "^3.0.0"
```

### 3. Build Command
Pastikan di Vercel settings:
```bash
npm run build && npx prisma generate
```

---

## 🔍 Cara Debug di Vercel:

### 1. Cek Logs
```
Vercel Dashboard → Project → Deployments → [Latest] → Function Logs
```

### 2. Cek Build Logs
```
Vercel Dashboard → Project → Deployments → [Latest] → Build Logs
```

### 3. Cek Environment Variables
```
Vercel Dashboard → Project → Settings → Environment Variables
```

Pastikan semua variable ada:
- ✅ DATABASE_URL
- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ JWT_SECRET
- ✅ JWT_REFRESH_SECRET
- ✅ NODE_ENV=production
- ✅ FRONTEND_URL
- ✅ ADMIN_FRONTEND_URL
- ✅ ALLOWED_ORIGINS

---

## 🔧 Langkah Perbaikan:

### Step 1: Redeploy dengan Perubahan Baru
```bash
# Di local, commit perubahan
git add .
git commit -m "fix: update vercel serverless handler"
git push

# Vercel akan auto-deploy
```

### Step 2: Cek Database Connection
Pastikan `DATABASE_URL` menggunakan connection pooling:
```
postgresql://user:pass@host:port/db?pgbouncer=true&connection_limit=1
```

### Step 3: Test Prisma Generate
Di Vercel build logs, cari:
```
✓ Prisma Client generated successfully
```

Jika tidak ada, tambahkan di build command:
```bash
npm run build && npx prisma generate
```

### Step 4: Cek CORS Settings
Pastikan `ALLOWED_ORIGINS` include frontend URLs:
```
https://your-user-app.vercel.app,https://your-admin-app.vercel.app
```

---

## 🐛 Common Errors & Solutions:

### Error: "Cannot find module '@prisma/client'"
**Solution:**
```bash
# Build command harus include:
npm run build && npx prisma generate
```

### Error: "Database connection failed"
**Solution:**
1. Cek DATABASE_URL format
2. Pastikan ada `?pgbouncer=true&connection_limit=1`
3. Cek IP whitelist di database provider

### Error: "JWT_SECRET is not defined"
**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Add JWT_SECRET (min 32 characters)
3. Redeploy

### Error: "CORS blocked"
**Solution:**
1. Cek ALLOWED_ORIGINS di environment variables
2. Pastikan include semua frontend URLs
3. Format: `url1,url2,url3` (comma-separated, no spaces)

### Error: "Function timeout"
**Solution:**
- Vercel Free: 10 second timeout
- Upgrade to Pro: 60 second timeout
- Optimize slow queries

---

## 📊 Monitoring

### Real-time Logs
```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs [deployment-url]
```

### Health Check
```bash
curl https://your-api.vercel.app/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-02-11T...",
  "uptime": 123.45,
  "environment": "production"
}
```

---

## 🔄 Redeploy Checklist:

- [ ] Commit & push perubahan terbaru
- [ ] Vercel auto-deploy triggered
- [ ] Build logs: ✅ Success
- [ ] Prisma generate: ✅ Success
- [ ] Function logs: No errors
- [ ] Health check: ✅ 200 OK
- [ ] Test API endpoints
- [ ] Update frontend URLs

---

## 🆘 Masih Error?

### 1. Check Vercel Status
https://www.vercel-status.com/

### 2. Check Database Status
Login ke Supabase/database provider

### 3. Test Locally
```bash
# Set production env
cp .env.production.example .env

# Test build
npm run build

# Test start
npm start

# Test endpoint
curl http://localhost:8080/api/v1/health
```

### 4. Contact Support
- Vercel Support: https://vercel.com/support
- Check Vercel Community: https://github.com/vercel/vercel/discussions

---

**Last Updated:** 2025-02-11
**Status:** Troubleshooting Guide Ready ✅
