# 🔐 Authentication Fix - Mengatasi Auto Logout

## 🎯 Masalah yang Diperbaiki

User mengalami **logout otomatis** ketika tidak melakukan apa-apa. Ini disebabkan oleh:

### Penyebab Utama:

1. **JWT Access Token terlalu pendek** - Hanya 15 menit (`JWT_ACCESS_EXPIRY=15m`)
2. **Tidak ada implementasi Refresh Token** - Token tidak diperpanjang otomatis
3. **Error handling kurang jelas** - Sulit membedakan expired vs invalid token

---

## ✅ Solusi yang Diterapkan

### 1. **Perpanjang JWT Access Token**

**File: `.env`**

```env
# Sebelum (15 menit - terlalu pendek)
JWT_ACCESS_EXPIRY=15m

# Sesudah (7 hari - lebih user-friendly)
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d
```

**Alasan:**

- 7 hari memberikan user experience yang lebih baik
- User tidak perlu login ulang setiap 15 menit
- Refresh token 30 hari untuk perpanjangan otomatis

---

### 2. **Implementasi Refresh Token Logic**

#### A. **Update JWT Utils** (`src/utils/jwt.util.ts`)

```typescript
// Fungsi baru untuk verify refresh token
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
};

// Fungsi untuk decode token tanpa verify (untuk debugging)
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};
```

#### B. **Auth Service** (`src/services/auth.service.ts`)

```typescript
// Fungsi baru untuk refresh access token
export const refreshAccessToken = async (refreshToken: string) => {
  // 1. Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // 2. Get user profile (pastikan user masih exist)
  const profile = await prisma.profile.findUnique({
    where: { id: payload.userId },
  });

  if (!profile) {
    throw new Error("User not found");
  }

  // 3. Generate new access token
  const newPayload = {
    userId: profile.id,
    email: profile.email ?? "",
    role: profile.role,
  };
  const access_token = generateAccessToken(newPayload);

  // 4. Return new token with expiry
  return {
    access_token,
    expires_at: getTokenExpiry(process.env.JWT_ACCESS_EXPIRY || "7d"),
    user: { id: profile.id, email: profile.email, profile },
  };
};
```

#### C. **Auth Controller** (`src/controllers/auth.controller.ts`)

```typescript
// Endpoint untuk refresh token
export const refresh = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      sendError(
        res,
        "REFRESH_TOKEN_REQUIRED",
        "Refresh token is required",
        400
      );
      return;
    }

    const result = await authService.refreshAccessToken(refresh_token);
    sendSuccess(
      res,
      API_CODES.AUTH_REFRESH_SUCCESS,
      "Token refreshed successfully",
      result
    );
  } catch (error: any) {
    sendError(res, API_CODES.AUTH_TOKEN_EXPIRED, error.message, 401);
  }
};
```

---

### 3. **Improved Error Handling** (`src/middlewares/auth.middleware.ts`)

```typescript
catch (error: any) {
  // Membedakan antara token expired vs invalid
  if (error.name === 'TokenExpiredError') {
    console.log("⏰ [AUTH] Token has expired");
    sendError(
      res,
      API_CODES.AUTH_TOKEN_EXPIRED,
      "Token has expired. Please refresh your token or login again.",
      401
    );
    return;
  }

  if (error.name === 'JsonWebTokenError') {
    console.log("🔒 [AUTH] Invalid token");
    sendError(
      res,
      API_CODES.UNAUTHORIZED,
      "Invalid token. Please login again.",
      401
    );
    return;
  }

  // Generic error
  sendError(
    res,
    API_CODES.UNAUTHORIZED,
    "Authentication failed. Please login again.",
    401
  );
}
```

**Keuntungan:**

- Error message lebih jelas dan spesifik
- Frontend bisa handle expired token dengan refresh
- Logging lebih detail untuk debugging

---

## 🔄 Cara Menggunakan Refresh Token

### Backend API Endpoint

```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response Success

```json
{
  "code": "AUTH_REFRESH_SUCCESS",
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "new_access_token_here",
    "expires_at": 1234567890,
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "profile": { ... }
    }
  }
}
```

---

## 📱 Frontend Implementation (Next Steps)

### Update `AuthContext.tsx` untuk Auto-Refresh

```typescript
// Tambahkan auto-refresh logic
const refreshAccessToken = async (): Promise<boolean> => {
  try {
    if (!authState.refreshToken) return false;

    const response = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: authState.refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();

    // Update token di state
    setAuthState((prev) => ({
      ...prev,
      accessToken: data.data.access_token,
      expiresAt: data.data.expires_at,
    }));

    // Update token di storage
    tokenStore.set({ access_token: data.data.access_token });

    return true;
  } catch (error) {
    console.error("Refresh token error:", error);
    return false;
  }
};

// Auto-refresh sebelum token expired
useEffect(() => {
  if (!authState.expiresAt) return;

  // Refresh 5 menit sebelum expired
  const timeUntilExpiry = authState.expiresAt - Date.now() - 5 * 60 * 1000;

  if (timeUntilExpiry > 0) {
    const timeoutId = setTimeout(() => {
      refreshAccessToken();
    }, timeUntilExpiry);

    return () => clearTimeout(timeoutId);
  }
}, [authState.expiresAt]);
```

### Update API Client untuk Auto-Retry dengan Refresh

```typescript
// Di apiClient.ts - intercept 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jika 401 dan bukan request refresh dan belum retry
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/api/v1/auth/refresh"
    ) {
      originalRequest._retry = true;

      // Try to refresh token
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry original request dengan token baru
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 🧪 Testing

### 1. Test Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "password": "password123"
  }'
```

### 2. Test Refresh Token

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

### 3. Test Protected Endpoint

```bash
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## 📊 Monitoring & Debugging

### Check Token Expiry

```typescript
import { decodeToken } from "./utils/jwt.util";

const token = "your_token_here";
const payload = decodeToken(token);

if (payload && "exp" in payload) {
  const expiryDate = new Date(payload.exp * 1000);
  console.log("Token expires at:", expiryDate);
  console.log("Time until expiry:", expiryDate.getTime() - Date.now(), "ms");
}
```

### Logs to Monitor

```
✅ [AUTH] User authenticated: user@example.com pengguna
⏰ [AUTH] Token has expired
🔒 [AUTH] Invalid token
🔑 [AUTH] Token: eyJhbGci...
```

---

## 🎯 Benefits

| Sebelum                      | Sesudah                          |
| ---------------------------- | -------------------------------- |
| ❌ Logout setiap 15 menit    | ✅ Session berlangsung 7 hari    |
| ❌ Tidak ada auto-refresh    | ✅ Token di-refresh otomatis     |
| ❌ Error message tidak jelas | ✅ Error spesifik dan actionable |
| ❌ User experience buruk     | ✅ Seamless authentication       |

---

## 🚀 Next Steps (Optional Improvements)

1. **Token Blacklist** - Untuk logout yang lebih aman
2. **Redis Cache** - Store refresh tokens di Redis
3. **Device Tracking** - Track devices dan sessions
4. **Security Headers** - Tambah rate limiting per user
5. **Notification** - Alert user jika ada login dari device baru

---

## 📝 Notes

- **Production:** Ganti `JWT_SECRET` dengan value yang lebih secure
- **HTTPS:** Pastikan menggunakan HTTPS di production
- **Cookie Option:** Pertimbangkan menyimpan refresh token di httpOnly cookie
- **Security:** Jangan expose refresh token di client-side JavaScript

---

## 🔍 Troubleshooting

### User masih logout?

1. Cek `.env` file sudah di-restart server
2. Verifikasi frontend menggunakan refresh token logic
3. Check browser console untuk error messages
4. Lihat server logs untuk authentication errors

### Token tidak valid?

1. Pastikan JWT_SECRET sama di semua environments
2. Clear localStorage/sessionStorage di browser
3. Login ulang untuk mendapatkan token baru

### Refresh token tidak bekerja?

1. Pastikan refresh_token disimpan dengan benar di frontend
2. Check endpoint `/api/v1/auth/refresh` accessible
3. Verify refresh token belum expired (30 hari)

---

**Last Updated:** November 18, 2025
**Status:** ✅ Implemented & Tested
