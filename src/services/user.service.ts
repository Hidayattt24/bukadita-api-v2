import bcrypt from "bcrypt";
import prisma from "../config/database";
import supabase from "../config/supabase";
import logger from "../config/logger";
import { normalizePhone } from "../utils/phone.util";

export interface UpdateProfileData {
  full_name?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  profil_url?: string;
}

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        address: true,
        date_of_birth: true,
        profil_url: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    return profile;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: UpdateProfileData) {
    // Validate and normalize phone if provided
    let normalizedPhone = data.phone;
    if (data.phone) {
      normalizedPhone = normalizePhone(data.phone);

      // Check if phone is already used by another user
      const existingProfile = await prisma.profile.findFirst({
        where: {
          phone: normalizedPhone,
          NOT: { id: userId },
        },
      });

      if (existingProfile) {
        throw new Error("Phone number already used by another user");
      }
    }

    // Parse date_of_birth if provided
    let parsedDateOfBirth: Date | undefined;
    if (data.date_of_birth) {
      parsedDateOfBirth = new Date(data.date_of_birth);
      if (isNaN(parsedDateOfBirth.getTime())) {
        throw new Error("Invalid date format");
      }
    }

    // Update profile
    const profile = await prisma.profile.update({
      where: { id: userId },
      data: {
        ...(data.full_name && { full_name: data.full_name }),
        ...(normalizedPhone !== undefined && { phone: normalizedPhone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(parsedDateOfBirth && { date_of_birth: parsedDateOfBirth }),
        ...(data.profil_url !== undefined && { profil_url: data.profil_url }),
        updated_at: new Date(),
      },
    });

    logger.info(`Profile updated for user: ${userId}`);
    return profile;
  }

  /**
   * Upload profile photo to Supabase Storage
   */
  static async uploadProfilePhoto(
    userId: string,
    file: Express.Multer.File
  ): Promise<{ photo_url: string; filename: string }> {
    try {
      // Get user profile
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Delete old photo if exists
      if (profile.profil_url) {
        const oldPath = profile.profil_url.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("profile-photos")
            .remove([`${userId}/${oldPath}`]);
        }
      }

      // Generate unique filename
      const fileExt = file.originalname.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        logger.error("Supabase upload error:", uploadError);
        throw new Error(`Failed to upload photo: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      const photo_url = urlData.publicUrl;

      // Update profile with new photo URL
      await prisma.profile.update({
        where: { id: userId },
        data: {
          profil_url: photo_url,
          updated_at: new Date(),
        },
      });

      logger.info(`Profile photo uploaded for user: ${userId}`);

      return {
        photo_url,
        filename: fileName,
      };
    } catch (error) {
      logger.error("Upload profile photo error:", error);
      throw error;
    }
  }

  /**
   * Delete profile photo
   */
  static async deleteProfilePhoto(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (!profile.profil_url) {
      throw new Error("No profile photo to delete");
    }

    // Delete from Supabase Storage
    const filePath = profile.profil_url.split("/").pop();
    if (filePath) {
      await supabase.storage
        .from("profile-photos")
        .remove([`${userId}/${filePath}`]);
    }

    // Update profile
    const updatedProfile = await prisma.profile.update({
      where: { id: userId },
      data: {
        profil_url: null,
        updated_at: new Date(),
      },
    });

    logger.info(`Profile photo deleted for user: ${userId}`);
    return updatedProfile;
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    // Get user credentials
    const { data: credentials, error } = await supabase
      .from("user_credentials")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !credentials) {
      throw new Error("User credentials not found");
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      currentPassword,
      credentials.password_hash
    );

    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password in Supabase
    const { error: updateError } = await supabase
      .from("user_credentials")
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      logger.error("Failed to update password:", updateError);
      throw new Error("Failed to update password");
    }

    // Also update in Supabase Auth
    try {
      await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
    } catch (authError) {
      logger.warn("Failed to update Supabase Auth password:", authError);
      // Continue even if this fails, as we've already updated the credentials table
    }

    logger.info(`Password changed for user: ${userId}`);
    return true;
  }
}
