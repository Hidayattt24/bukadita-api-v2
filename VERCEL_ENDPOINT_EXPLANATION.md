# 🔍 Penjelasan Detail Endpoint Vercel - BUKADITA API

## 📖 Cara Kerja Serverless di Vercel

### Traditional Server vs Serverless

**Traditional (Development - `npm run dev`):**

```
Client → Express Server (Running 24/7) → Database
         Port 8080
         app.listen()
```

**Serverless (Vercel Production):**

```
Client → Vercel Edge Network → Serverless Function → Database
         (Auto-scaled)          (api/index.ts)
         (Cold start ~1-2s)     (Warm ~100ms)
```

---

## 🏗️ Struktur Kode untuk Vercel

### 1. File `api/index.ts` - Entry Point

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
dotenv.config();
import app from "../src/app";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    await new Promise<void>((resolve, reject) => {
      // Passing Vercel req/res ke Express app
      app(req as any, res as any);

      // Wait sampai response selesai
      res.on("finish", () => resolve());
      res.on("error", (err) => reject(err));
    });
  } catch (error) {
    console.error("Serverless function error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: true,
        code: "INTERNAL_SERVER_ERROR",
        message: "Serverless function crashed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
};
```

**Penjelasan:**

1. **`export default async`** - Vercel butuh default export function
2. **`VercelRequest, VercelResponse`** - Type dari Vercel, bukan Express
3. **`Promise wrapper`** - Express app asynchronous, butuh di-wrap
4. **`res.on("finish")`** - Wait sampai Express selesai kirim response
5. **Error handling** - Catch semua error dan kirim response proper

---

### 2. File `src/app.ts` - Express Application

```typescript
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
// ... imports lainnya

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    error: false,
    code: "HEALTH_OK",
    message: "Server is healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
  });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/modules", moduleRoutes);
// ... routes lainnya

// Export app (JANGAN app.listen() di sini!)
export default app;
```

**Penting:**

- ✅ Export `app` saja
- ❌ JANGAN panggil `app.listen()` - ini untuk serverless!
- ✅ `app.listen()` hanya di `src/server.ts` untuk local dev

---

### 3. File `src/server.ts` - Local Development Only

```typescript
import app from "./app";

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Catatan:**

- File ini **TIDAK** digunakan di Vercel
- Hanya untuk `npm run dev` (local development)
- Di Vercel, entry point adalah `api/index.ts`

---

### 4. File `vercel.json` - Routing Configuration

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/health",
      "dest": "api/index.ts"
    },
    {
      "src": "/api/v1/(.*)",
      "dest": "api/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["sin1"],
  "functions": {
    "api/index.ts": {
      "maxDuration": 10,
      "memory": 1024
    }
  }
}
```

**Penjelasan Detail:**

#### `builds`

```json
{
  "src": "api/index.ts", // Entry point
  "use": "@vercel/node" // Builder untuk Node.js
}
```

- Memberitahu Vercel untuk build file `api/index.ts` sebagai Node.js function

#### `routes`

```json
[
  { "src": "/health", "dest": "api/index.ts" },
  { "src": "/api/v1/(.*)", "dest": "api/index.ts" },
  { "src": "/(.*)", "dest": "api/index.ts" }
]
```

**Cara Kerja Routing:**

1. Client request: `GET https://bukadita-api-v2.vercel.app/health`
2. Vercel match route: `/health` → `api/index.ts`
3. Function `api/index.ts` dipanggil dengan `req.url = "/health"`
4. Express app handle route: `app.get("/health", ...)`
5. Response dikirim kembali ke client

**Contoh Request Flow:**

```
Request: GET /api/v1/modules

1. Vercel Edge: Route matching...
2. Match: "/api/v1/(.*)" → api/index.ts
3. Cold start (jika function idle): ~1-2 detik
4. Function execute: api/index.ts
5. Express routing: /api/v1/modules → moduleRoutes
6. Controller: moduleController.getAllModules()
7. Database query via Prisma
8. Response: JSON array of modules
9. Function idle/cleanup
```

#### `regions`

```json
"regions": ["sin1"]
```

- `sin1` = Singapore (AWS ap-southeast-1)
- Dekat dengan Supabase database (also Singapore)
- Lower latency = faster response

#### `functions`

```json
"functions": {
  "api/index.ts": {
    "maxDuration": 10,    // 10 seconds timeout (Free plan limit)
    "memory": 1024        // 1GB RAM
  }
}
```

**Vercel Plan Limits:**

- **Free:** 10s timeout, 1GB RAM
- **Pro:** 60s timeout, 3GB RAM max
- **Enterprise:** Custom

---

## 🔌 Database Connection di Serverless

### Masalah Traditional Connection

```typescript
// ❌ JANGAN ini di serverless
const client = new Pool({
  connectionString: DATABASE_URL,
  max: 20, // 20 connections per function instance
});
```

**Kenapa bermasalah?**

- Setiap function invocation = new instance
- 100 concurrent requests = 100 instances × 20 connections = 2000 connections!
- Database kehabisan connections → crash

---

### ✅ Solution: Prisma + Connection Pooling

**1. File `src/config/database.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export default prisma;
```

**2. File `prisma/schema.prisma`**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")    // Pooler connection
  directUrl = env("DIRECT_URL")      // Direct connection (for migrations)
}
```

**3. Environment Variable**

```bash
# Connection Pooler (untuk queries)
DATABASE_URL="postgresql://...@host:6543/db?pgbouncer=true&connection_limit=1&pool_timeout=0"

# Direct Connection (untuk migrations, schema introspection)
DIRECT_URL="postgresql://...@host:5432/db"
```

**Parameter Penting:**

- `pgbouncer=true` - Menggunakan PgBouncer pooler
- `connection_limit=1` - Max 1 connection per function instance
- `pool_timeout=0` - Immediate timeout jika pool penuh
- Port `6543` - Supabase Pooler port (Transaction mode)
- Port `5432` - Direct PostgreSQL port

**Cara Kerja:**

```
Serverless Function → Prisma Client → PgBouncer Pooler → PostgreSQL
                      (1 connection)   (Pool 15-20)     (Database)
```

---

## 🔄 Request Lifecycle

### Cold Start (First Request atau setelah idle)

```
1. Request arrives at Vercel Edge
   ↓
2. Edge routes to Singapore region (sin1)
   ↓
3. Vercel spins up new container
   ↓
4. Load Node.js runtime (~500ms)
   ↓
5. Execute api/index.ts (~200ms)
   ↓
6. Import dependencies (~300ms)
   ↓
7. dotenv.config() - Load env vars (~50ms)
   ↓
8. Import Express app (~200ms)
   ↓
9. Prisma Client initialization (~300ms)
   ↓
10. Database connection via pooler (~200ms)
    ↓
11. Execute route handler
    ↓
12. Query database (~100-500ms)
    ↓
13. Send response
    ↓
14. Function stays warm for ~5 minutes

Total Cold Start: ~1.5-2.5 seconds
```

### Warm Start (Function sudah active)

```
1. Request arrives
   ↓
2. Reuse existing container
   ↓
3. Execute route handler (~10ms)
   ↓
4. Query database (~100-500ms)
   ↓
5. Send response

Total Warm Start: ~110-510ms
```

---

## 📊 Monitoring & Debugging

### 1. Function Logs

**Access:**

```
Vercel Dashboard → Deployments → [Latest] → Functions
```

**What to check:**

- ✅ Function invocations count
- ✅ Cold start frequency
- ✅ Average response time
- ✅ Error rate
- ✅ Memory usage

**Sample Log:**

```
INFO  Serverless function invoked: GET /api/v1/modules
INFO  Prisma query: findMany - modules (120ms)
INFO  Response sent: 200 OK (145ms total)
```

### 2. Error Tracking

**Common Errors:**

**Error: Function timeout (10s exceeded)**

```
Solutions:
1. Optimize database queries (add indexes)
2. Reduce data payload size
3. Cache frequent queries
4. Upgrade to Pro plan (60s timeout)
```

**Error: Database connection failed**

```
Check:
1. DATABASE_URL format correct?
2. Connection pooling enabled?
3. Supabase pooler status?
4. IP whitelist (if enabled)?
```

**Error: Cannot find module '@prisma/client'**

```
Fix:
1. Ensure "postinstall": "prisma generate" in package.json
2. Check build logs for Prisma generation
3. Redeploy
```

### 3. Performance Monitoring

**Key Metrics:**

- **P50 latency:** Median response time (target: <500ms warm)
- **P95 latency:** 95th percentile (target: <2s)
- **P99 latency:** 99th percentile (includes cold starts)
- **Error rate:** Target <1%
- **Cold start rate:** Target <10%

**How to improve:**

```typescript
// 1. Minimize cold start by keeping imports small
// ❌ Don't import unused modules
import * as lodash from "lodash"; // Entire library

// ✅ Import only what you need
import { pick } from "lodash";

// 2. Database query optimization
// ❌ Fetch all data
const modules = await prisma.module.findMany({
  include: { subMateri: { include: { materi: true } } },
});

// ✅ Fetch only needed fields
const modules = await prisma.module.findMany({
  select: { id: true, title: true, slug: true },
});

// 3. Response caching (for public endpoints)
res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
```

---

## 🧪 Testing Endpoints

### Local Testing (Before Deploy)

```bash
# Start dev server
npm run dev

# Test health
curl http://localhost:8080/health

# Test auth
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","full_name":"Test","phone":"+628123456789","password":"Test123"}'

# Test modules
curl http://localhost:8080/api/v1/modules
```

### Production Testing (After Deploy)

```bash
# Health check
curl https://bukadita-api-v2.vercel.app/health

# Modules (public)
curl https://bukadita-api-v2.vercel.app/api/v1/modules

# Protected endpoint (needs JWT)
curl https://bukadita-api-v2.vercel.app/api/v1/progress/modules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Load Testing

```bash
# Install Apache Bench
# Windows: download from https://www.apachelounge.com/download/

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 https://bukadita-api-v2.vercel.app/health

# Check:
# - Requests per second
# - Time per request
# - Failed requests (should be 0)
```

---

## 🔐 Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env` to git
- ✅ Use Vercel Environment Variables
- ✅ Different values for dev/preview/production

### 2. JWT Security

```typescript
// ✅ Strong secret (min 32 chars)
JWT_SECRET=your_very_long_random_secret_minimum_32_characters

// ✅ Short expiry for access token
JWT_ACCESS_EXPIRY=15m

// ✅ Longer for refresh token
JWT_REFRESH_EXPIRY=7d
```

### 3. CORS Configuration

```typescript
// ✅ Whitelist specific origins
const corsOptions = {
  origin: [process.env.ADMIN_URL, process.env.USER_URL],
  credentials: true,
};

// ❌ Don't allow all origins in production
origin: "*"; // DANGER!
```

### 4. Rate Limiting (Optional)

```typescript
// Consider re-enabling for production
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api", limiter);
```

---

## 📚 Reference

### Vercel Docs

- Serverless Functions: https://vercel.com/docs/functions
- Environment Variables: https://vercel.com/docs/projects/environment-variables
- Build Configuration: https://vercel.com/docs/build-step

### Prisma + Vercel

- Best Practices: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
- Connection Pooling: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

### Supabase

- Connection Pooler: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
- Performance: https://supabase.com/docs/guides/platform/performance

---

**Last Updated:** November 2, 2025  
**Status:** Production Ready ✅
