import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Validate and get expiry - handle empty string case
const getValidExpiry = (envValue: string | undefined, defaultValue: string): string => {
  if (!envValue || envValue.trim() === "") {
    return defaultValue;
  }
  // Validate format (e.g., "7d", "30d", "1h", "60")
  const isValidFormat = /^(\d+[smhd]|\d+)$/.test(envValue.trim());
  return isValidFormat ? envValue.trim() : defaultValue;
};

const JWT_ACCESS_EXPIRY = getValidExpiry(process.env.JWT_ACCESS_EXPIRY, "7d");
const JWT_REFRESH_EXPIRY = getValidExpiry(process.env.JWT_REFRESH_EXPIRY, "30d");

// Log the expiry values for debugging (only in development)
if (process.env.NODE_ENV !== "production") {
  console.log("🔑 JWT_ACCESS_EXPIRY:", JWT_ACCESS_EXPIRY);
  console.log("🔑 JWT_REFRESH_EXPIRY:", JWT_REFRESH_EXPIRY);
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const getTokenExpiry = (expiresIn: string): number => {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1));
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return Date.now() + value * multipliers[unit];
};
