# Vercel Environment Variables - CORS Setup

## Required Environment Variables for CORS

Tambahkan environment variables berikut di Vercel Dashboard untuk project `bukadita-api-v2`:

### ADMIN_URL
```
https://bukadita-admin-v2.vercel.app,https://admin.bukadita.id,http://localhost:3000
```

### USER_URL
```
https://bukadita-user-v2.vercel.app,https://www.bukadita.id,https://bukadita.id,http://localhost:3001
```

## Cara Setup di Vercel Dashboard

1. Buka https://vercel.com/dashboard
2. Pilih project **bukadita-api-v2**
3. Klik tab **Settings**
4. Klik **Environment Variables** di sidebar
5. Tambahkan/Update variable berikut:

### Variable 1: ADMIN_URL
- **Key**: `ADMIN_URL`
- **Value**: `https://bukadita-admin-v2.vercel.app,https://admin.bukadita.id,http://localhost:3000`
- **Environment**: Production, Preview, Development (pilih semua)

### Variable 2: USER_URL
- **Key**: `USER_URL`
- **Value**: `https://bukadita-user-v2.vercel.app,https://www.bukadita.id,https://bukadita.id,http://localhost:3001`
- **Environment**: Production, Preview, Development (pilih semua)

6. Klik **Save**
7. **Redeploy** project agar environment variables baru ter-load

## Catatan

- Format: Multiple URLs dipisahkan dengan koma (`,`)
- Localhost URLs ditambahkan untuk development/testing
- Setelah update env vars, **WAJIB redeploy** agar perubahan berlaku
- Backend akan otomatis allow CORS dari semua URL yang didefinisikan

## Verifikasi

Setelah redeploy, test CORS dengan:

```bash
curl -I -X OPTIONS https://api.bukadita.id/api/v1/auth/login \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST"
```

Response header harus include:
```
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
```
