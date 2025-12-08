import bcrypt from "bcrypt";
import prisma from "../config/database";
import supabase from "../config/supabase";
import {
  generateAccessToken,
  generateRefreshToken,
  getTokenExpiry,
} from "../utils/jwt.util";
import {
  normalizePhone,
  getPhoneVariants,
  getIdentifierType,
} from "../utils/phone.util";
import logger from "../config/logger";

// Helper: Store password hash in Supabase
const storePasswordHash = async (
  userId: string,
  email: string,
  passwordHash: string,
  phone?: string
) => {
  try {
    const { error } = await supabase.from("user_credentials").upsert({
      id: userId,
      email,
      phone: phone || null,
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      logger.warn("Could not store password hash:", error.message);
    }
  } catch (err) {
    logger.warn("Password hash storage error:", err);
  }
};

// Helper: Get password hash from custom table by email or phone
const getPasswordHash = async (
  identifier: string
): Promise<{ hash: string; userId: string; email: string } | null> => {
  try {
    const identifierType = getIdentifierType(identifier);

    let query = supabase.from("user_credentials").select("*");

    if (identifierType === "email") {
      query = query.eq("email", identifier);
    } else if (identifierType === "phone") {
      // Try all phone variants
      const phoneVariants = getPhoneVariants(identifier);
      query = query.or(phoneVariants.map((p) => `phone.eq.${p}`).join(","));
    } else {
      return null;
    }

    const { data, error } = await query.single();

    if (error || !data) return null;

    return {
      hash: data.password_hash,
      userId: data.id,
      email: data.email,
    };
  } catch (err) {
    logger.error("Get password hash error:", err);
    return null;
  }
};

export const register = async (data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}) => {
  // Normalize phone if provided
  const normalizedPhone = data.phone ? normalizePhone(data.phone) : undefined;

  // 1. Check if email or phone already exists
  const existingProfile = await prisma.profile.findFirst({
    where: {
      OR: [
        { email: data.email },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    },
  });

  if (existingProfile) {
    if (existingProfile.email === data.email) {
      throw new Error("Email already registered");
    }
    if (normalizedPhone && existingProfile.phone === normalizedPhone) {
      throw new Error("Phone number already registered");
    }
  }

  // 2. Hash password
  const password_hash = await bcrypt.hash(data.password, 12);

  // 3. Create Supabase auth user
  const { data: authData, error } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });

  if (error || !authData.user) {
    throw new Error(error?.message || "Failed to create user");
  }

  // 4. Store password hash for manual login
  await storePasswordHash(
    authData.user.id,
    data.email,
    password_hash,
    normalizedPhone
  );

  // 5. Create profile
  const profile = await prisma.profile.create({
    data: {
      id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      phone: normalizedPhone,
      role: "pengguna",
    },
  });

  // 6. Generate tokens
  const payload = {
    userId: authData.user.id,
    email: data.email,
    role: "pengguna",
  };
  const access_token = generateAccessToken(payload);
  const refresh_token = generateRefreshToken(payload);

  return {
    access_token,
    refresh_token,
    expires_at: getTokenExpiry(process.env.JWT_ACCESS_EXPIRY || "15m"),
    user: {
      id: authData.user.id,
      email: authData.user.email,
      email_confirmed_at: authData.user.email_confirmed_at,
      profile,
    },
  };
};

export const login = async (data: { identifier: string; password: string }) => {
  logger.info("Login attempt with identifier:", {
    identifier: data.identifier,
    type: getIdentifierType(data.identifier),
  });

  // 1. Try to get password hash from our custom table (supports email & phone)
  const credentialData = await getPasswordHash(data.identifier);

  if (!credentialData) {
    logger.warn("No credentials found for identifier:", data.identifier);
    throw new Error("Invalid credentials");
  }

  // 2. Verify password with bcrypt
  const isValid = await bcrypt.compare(data.password, credentialData.hash);
  if (!isValid) {
    logger.warn("Invalid password for identifier:", data.identifier);
    throw new Error("Invalid credentials");
  }

  // 3. Get profile from database
  const profile = await prisma.profile.findUnique({
    where: { id: credentialData.userId },
  });

  if (!profile) {
    logger.error("Profile not found for user:", credentialData.userId);
    throw new Error("Profile not found");
  }

  // 4. Get user from Supabase (for email_confirmed_at)
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find((u) => u.id === credentialData.userId);

  // 5. Generate tokens
  const payload = {
    userId: profile.id,
    email: profile.email ?? "",
    role: profile.role,
  };
  const access_token = generateAccessToken(payload);
  const refresh_token = generateRefreshToken(payload);

  logger.info("Login successful for user:", {
    userId: profile.id,
    role: profile.role,
  });

  return {
    access_token,
    refresh_token,
    expires_at: getTokenExpiry(process.env.JWT_ACCESS_EXPIRY || "15m"),
    user: {
      id: profile.id,
      email: profile.email,
      email_confirmed_at: user?.email_confirmed_at || null,
      profile,
    },
  };
};

export const upsertProfile = async (
  userId: string,
  data: {
    full_name?: string;
    phone?: string;
    address?: string;
    date_of_birth?: Date;
    profil_url?: string;
  }
) => {
  const profile = await prisma.profile.upsert({
    where: { id: userId },
    update: {
      ...data,
      updated_at: new Date(),
    },
    create: {
      id: userId,
      full_name: data.full_name || "User",
      phone: data.phone,
      address: data.address,
      date_of_birth: data.date_of_birth,
      profil_url: data.profil_url,
      role: "pengguna",
    },
  });

  return profile;
};

export const createMissingProfile = async (
  userId: string,
  data: {
    full_name: string;
    phone?: string;
  }
) => {
  // Check if profile exists
  const existingProfile = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (existingProfile) {
    return existingProfile;
  }

  // Create new profile
  const profile = await prisma.profile.create({
    data: {
      id: userId,
      full_name: data.full_name,
      phone: data.phone,
      role: "pengguna",
    },
  });

  return profile;
};

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    // Import verifyRefreshToken from jwt.util
    const { verifyRefreshToken } = require("../utils/jwt.util");

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    logger.info("Refresh token verified for user:", payload.userId);

    // Get user profile to ensure user still exists
    const profile = await prisma.profile.findUnique({
      where: { id: payload.userId },
    });

    if (!profile) {
      throw new Error("User not found");
    }

    // Generate new access token
    const newPayload = {
      userId: profile.id,
      email: profile.email ?? "",
      role: profile.role,
    };
    const access_token = generateAccessToken(newPayload);

    logger.info("New access token generated for user:", profile.id);

    return {
      access_token,
      expires_at: getTokenExpiry(process.env.JWT_ACCESS_EXPIRY || "7d"),
      user: {
        id: profile.id,
        email: profile.email,
        profile,
      },
    };
  } catch (error) {
    logger.error("Refresh token error:", error);
    throw new Error("Invalid or expired refresh token");
  }
};
