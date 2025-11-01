/**
 * Setup Test Accounts for API Testing
 * Creates superadmin, admin, and pengguna accounts if they don't exist
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const TEST_ACCOUNTS = [
  {
    email: "superadmin@bukadita.test",
    password: "superadmin123",
    full_name: "Super Admin Test",
    phone: "+6281234567890",
    role: "superadmin",
  },
  {
    email: "admin@bukadita.test",
    password: "admin123",
    full_name: "Admin Test",
    phone: "+6281234567891",
    role: "admin",
  },
  {
    email: "pengguna@bukadita.test",
    password: "pengguna123",
    full_name: "Pengguna Test",
    phone: "+6281234567892",
    role: "pengguna",
  },
];

async function setupTestAccounts() {
  console.log("🚀 Setting up test accounts...\n");

  for (const account of TEST_ACCOUNTS) {
    console.log(`\n📝 Processing ${account.role}: ${account.email}`);

    try {
      // Check if profile already exists
      const existingProfile = await prisma.profile.findFirst({
        where: {
          OR: [{ email: account.email }, { phone: account.phone }],
        },
      });

      if (existingProfile) {
        console.log(`   ✅ Profile already exists: ${existingProfile.id}`);
        console.log(`   📧 Email: ${existingProfile.email}`);
        console.log(`   👤 Name: ${existingProfile.full_name}`);
        console.log(`   🎭 Current Role: ${existingProfile.role}`);

        // Update role if different
        if (existingProfile.role !== account.role) {
          console.log(`   🔄 Updating role to: ${account.role}`);
          await prisma.profile.update({
            where: { id: existingProfile.id },
            data: { role: account.role },
          });
          console.log(`   ✅ Role updated successfully`);
        }

        // Check if credentials exist in user_credentials table
        const { data: existingCreds } = await supabase
          .from("user_credentials")
          .select("*")
          .eq("id", existingProfile.id)
          .single();

        if (!existingCreds) {
          console.log(`   🔄 Adding credentials to user_credentials table...`);
          const passwordHash = await bcrypt.hash(account.password, 12);

          const { error: credError } = await supabase
            .from("user_credentials")
            .upsert({
              id: existingProfile.id,
              email: account.email,
              phone: account.phone,
              password_hash: passwordHash,
              updated_at: new Date().toISOString(),
            });

          if (credError) {
            console.log(`   ⚠️ Could not store credentials: ${credError.message}`);
          } else {
            console.log(`   ✅ Credentials stored in user_credentials table`);
          }
        } else {
          console.log(`   ✅ Credentials already exist in user_credentials table`);
        }

        // Try to get or create Supabase user
        const { data: supabaseUser, error: getUserError } =
          await supabase.auth.admin.getUserById(existingProfile.id);

        if (getUserError || !supabaseUser) {
          console.log(`   ⚠️ Supabase user not found, creating...`);

          // Create Supabase user with existing profile ID
          const { data: newSupabaseUser, error: createError } =
            await supabase.auth.admin.createUser({
              email: account.email,
              password: account.password,
              email_confirm: true,
              user_metadata: {
                full_name: account.full_name,
                phone: account.phone,
              },
            });

          if (createError) {
            console.log(`   ⚠️ Could not create Supabase user: ${createError.message}`);
          } else {
            console.log(`   ✅ Supabase user created: ${newSupabaseUser.user?.id}`);
          }
        } else {
          console.log(`   ✅ Supabase user exists: ${supabaseUser.user.id}`);
        }

        continue;
      }

      // Create new Supabase user
      console.log(`   🆕 Creating new account...`);

      const { data: supabaseData, error: signUpError } =
        await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.full_name,
            phone: account.phone,
          },
        });

      if (signUpError) {
        console.log(`   ❌ Failed to create Supabase user: ${signUpError.message}`);
        continue;
      }

      const userId = supabaseData.user!.id;
      console.log(`   ✅ Supabase user created: ${userId}`);

      // Hash password for user_credentials table
      const passwordHash = await bcrypt.hash(account.password, 12);
      console.log(`   🔒 Password hashed`);

      // Store password hash in user_credentials table
      const { error: credError } = await supabase
        .from("user_credentials")
        .upsert({
          id: userId,
          email: account.email,
          phone: account.phone,
          password_hash: passwordHash,
          updated_at: new Date().toISOString(),
        });

      if (credError) {
        console.log(`   ⚠️ Could not store credentials: ${credError.message}`);
      } else {
        console.log(`   ✅ Credentials stored in user_credentials table`);
      }

      // Create profile in database
      const profile = await prisma.profile.create({
        data: {
          id: userId,
          email: account.email,
          full_name: account.full_name,
          phone: account.phone,
          role: account.role,
        },
      });

      console.log(`   ✅ Profile created: ${profile.id}`);
      console.log(`   📧 Email: ${profile.email}`);
      console.log(`   👤 Name: ${profile.full_name}`);
      console.log(`   🎭 Role: ${profile.role}`);
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("✨ Test accounts setup completed!");
  console.log("=".repeat(70));

  // Display summary
  console.log("\n📊 Account Summary:\n");

  for (const account of TEST_ACCOUNTS) {
    const profile = await prisma.profile.findFirst({
      where: { email: account.email },
    });

    if (profile) {
      console.log(`✅ ${account.role.toUpperCase()}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Password: ${account.password}`);
      console.log(`   Role in DB: ${profile.role}`);
      console.log(`   Profile ID: ${profile.id}\n`);
    } else {
      console.log(`❌ ${account.role.toUpperCase()} - Not found\n`);
    }
  }

  // Check for any existing superadmin accounts
  console.log("🔍 Checking for other superadmin accounts...\n");
  const allSuperadmins = await prisma.profile.findMany({
    where: { role: "superadmin" },
    select: {
      id: true,
      email: true,
      full_name: true,
      created_at: true,
    },
  });

  if (allSuperadmins.length > 0) {
    console.log(`Found ${allSuperadmins.length} superadmin account(s):\n`);
    allSuperadmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.full_name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Created: ${admin.created_at}\n`);
    });
  } else {
    console.log("⚠️ No superadmin accounts found!\n");
  }

  await prisma.$disconnect();
}

setupTestAccounts().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
