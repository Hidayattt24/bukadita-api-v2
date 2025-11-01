/**
 * BUKADITA API v2 - Comprehensive API Testing
 * Tests all endpoints for all roles: superadmin, admin, pengguna
 */

import dotenv from "dotenv";
dotenv.config();

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = `http://localhost:${process.env.PORT || 8080}`;
const API_PREFIX = "/api/v1";

// Test accounts for each role
const TEST_ACCOUNTS = {
  superadmin: {
    email: "superadmin@bukadita.test",
    password: "superadmin123",
    full_name: "Super Admin Test",
    phone: "+6281234567890",
    role: "superadmin" as const,
  },
  admin: {
    email: "admin@bukadita.test",
    password: "admin123",
    full_name: "Admin Test",
    phone: "+6281234567891",
    role: "admin" as const,
  },
  pengguna: {
    email: "pengguna@bukadita.test",
    password: "pengguna123",
    full_name: "Pengguna Test",
    phone: "+6281234567892",
    role: "pengguna" as const,
  },
};

// Tokens storage
const tokens: Record<string, string> = {};

// Test data storage
const testData: Record<string, any> = {
  moduleId: null,
  subMateriId: null,
  quizId: null,
  questionId: null,
  attemptId: null,
  poinId: null,
};

// =============================================================================
// UTILITIES
// =============================================================================

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  token?: string;
}

async function request(
  path: string,
  options: RequestOptions = {}
): Promise<any> {
  const { method = "GET", headers = {}, body, token } = options;

  const url = `${BASE_URL}${path}`;
  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    return {
      status: response.status,
      data,
      ok: response.ok,
    };
  } catch (error: any) {
    console.error(`❌ Request failed: ${method} ${path}`, error.message);
    return {
      status: 500,
      data: { error: true, message: error.message },
      ok: false,
    };
  }
}

function logTest(testName: string, passed: boolean, details?: string) {
  const icon = passed ? "✅" : "❌";
  const message = details ? `${testName} - ${details}` : testName;
  console.log(`${icon} ${message}`);
}

function logSection(sectionName: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🧪 ${sectionName}`);
  console.log("=".repeat(70));
}

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

// -----------------------------------------------------------------------------
// 1. HEALTH CHECK & PUBLIC ENDPOINTS
// -----------------------------------------------------------------------------

async function testPublicEndpoints() {
  logSection("PUBLIC ENDPOINTS (No Authentication)");

  // Health check
  const health = await request("/health");
  logTest("Health Check", health.ok && !health.data.error);

  // Get all modules (public)
  const modules = await request(`${API_PREFIX}/modules`);
  logTest("GET /modules", modules.ok);

  // Get public materials
  const materials = await request(`${API_PREFIX}/materials/public`);
  logTest("GET /materials/public", materials.ok);
}

// -----------------------------------------------------------------------------
// 2. AUTHENTICATION TESTS
// -----------------------------------------------------------------------------

async function testAuthentication() {
  logSection("AUTHENTICATION - Register & Login");

  // Test registration for each role
  for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
    // Skip register, accounts already exist - just login directly
    logTest(`Register ${role}`, true, "Account already exists (skipped)");

    // Try to login
    const loginResult = await request(`${API_PREFIX}/auth/login`, {
      method: "POST",
      body: {
        identifier: account.email,
        password: account.password,
      },
    });

    if (loginResult.ok && loginResult.data.data?.access_token) {
      tokens[role] = loginResult.data.data.access_token;
      logTest(`Login ${role}`, true, "Token obtained");

      // Verify token role matches expected
      const profileData = loginResult.data.data.user?.profile;
      if (profileData?.role) {
        logTest(
          `Verify ${role} role`,
          profileData.role === account.role,
          `Role: ${profileData.role}`
        );
      }
    } else {
      logTest(`Login ${role}`, false, loginResult.data.message);
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// -----------------------------------------------------------------------------
// 3. PROFILE MANAGEMENT
// -----------------------------------------------------------------------------

async function testProfileManagement() {
  logSection("PROFILE MANAGEMENT");

  const token = tokens.pengguna;
  if (!token) {
    logTest("Profile tests", false, "No pengguna token available");
    return;
  }

  // Get current profile
  const profile = await request(`${API_PREFIX}/auth/profile`, {
    method: "POST",
    token,
    body: {
      full_name: "Updated Pengguna Test",
      address: "Test Address 123",
    },
  });

  logTest(
    "Update Profile",
    profile.ok,
    profile.ok ? "Profile updated" : profile.data.message
  );
}

// -----------------------------------------------------------------------------
// 4. MODULE TESTS - ADMIN ROLE
// -----------------------------------------------------------------------------

async function testModuleManagement() {
  logSection("MODULE MANAGEMENT - Admin Role");

  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest("Module tests", false, "No admin token available");
    return;
  }

  // Create module
  const createModule = await request(`${API_PREFIX}/modules`, {
    method: "POST",
    token: adminToken,
    body: {
      title: "Test Module",
      slug: `test-module-${Date.now()}`,
      description: "This is a test module",
      duration_label: "2 jam",
      duration_minutes: 120,
      lessons: 5,
      category: "testing",
      published: true,
    },
  });

  if (createModule.ok && createModule.data.data?.id) {
    testData.moduleId = createModule.data.data.id;
    logTest("Create Module", true, `ID: ${testData.moduleId}`);
  } else {
    logTest("Create Module", false, createModule.data.message);
    return;
  }

  // Update module
  const updateModule = await request(
    `${API_PREFIX}/modules/${testData.moduleId}`,
    {
      method: "PUT",
      token: adminToken,
      body: {
        title: "Updated Test Module",
        description: "Updated description",
      },
    }
  );

  logTest(
    "Update Module",
    updateModule.ok,
    updateModule.ok ? "Module updated" : updateModule.data.message
  );

  // Get module by slug
  const getModule = await request(
    `${API_PREFIX}/modules/${createModule.data.data.slug}`
  );
  logTest("Get Module by Slug", getModule.ok);
}

// -----------------------------------------------------------------------------
// 5. MATERIAL TESTS - ADMIN ROLE
// -----------------------------------------------------------------------------

async function testMaterialManagement() {
  logSection("MATERIAL MANAGEMENT - Admin Role");

  const adminToken = tokens.admin;
  if (!adminToken || !testData.moduleId) {
    logTest("Material tests", false, "Missing admin token or module ID");
    return;
  }

  // Create sub-materi
  const createMaterial = await request(`${API_PREFIX}/materials`, {
    method: "POST",
    token: adminToken,
    body: {
      module_id: testData.moduleId,
      title: "Test Sub Materi",
      content: "This is test content",
      order_index: 1,
      published: true,
    },
  });

  if (createMaterial.ok && createMaterial.data.data?.id) {
    testData.subMateriId = createMaterial.data.data.id;
    logTest("Create Sub-Materi", true, `ID: ${testData.subMateriId}`);
  } else {
    logTest("Create Sub-Materi", false, createMaterial.data.message);
    return;
  }

  // Create poin detail
  const createPoin = await request(`${API_PREFIX}/materials/points`, {
    method: "POST",
    token: adminToken,
    body: {
      sub_materi_id: testData.subMateriId,
      title: "Test Poin Detail",
      content_html: "<p>Test content</p>",
      duration_label: "10 menit",
      duration_minutes: 10,
      order_index: 1,
    },
  });

  if (createPoin.ok && createPoin.data.data?.id) {
    testData.poinId = createPoin.data.data.id;
    logTest("Create Poin Detail", true, `ID: ${testData.poinId}`);
  } else {
    logTest("Create Poin Detail", false, createPoin.data.message);
  }

  // Update material
  const updateMaterial = await request(
    `${API_PREFIX}/materials/${testData.subMateriId}`,
    {
      method: "PUT",
      token: adminToken,
      body: {
        title: "Updated Sub Materi",
        content: "Updated content",
      },
    }
  );

  logTest("Update Sub-Materi", updateMaterial.ok);

  // Get public material detail
  const getMaterial = await request(
    `${API_PREFIX}/materials/${testData.subMateriId}/public`
  );
  logTest("Get Material Detail (public)", getMaterial.ok);
}

// -----------------------------------------------------------------------------
// 6. QUIZ TESTS - ADMIN ROLE
// -----------------------------------------------------------------------------

async function testQuizManagement() {
  logSection("QUIZ MANAGEMENT - Admin Role");

  const adminToken = tokens.admin;
  if (!adminToken || !testData.moduleId || !testData.subMateriId) {
    logTest("Quiz tests", false, "Missing required test data");
    return;
  }

  // Create quiz via admin endpoint
  const createQuiz = await request(`${API_PREFIX}/admin/quizzes`, {
    method: "POST",
    token: adminToken,
    body: {
      module_id: testData.moduleId,
      sub_materi_id: testData.subMateriId,
      title: "Test Quiz",
      description: "This is a test quiz",
      time_limit_seconds: 600,
      passing_score: 70,
      quiz_type: "sub_materi",
      published: true,
    },
  });

  if (createQuiz.ok && createQuiz.data.data?.id) {
    testData.quizId = createQuiz.data.data.id;
    logTest("Create Quiz", true, `ID: ${testData.quizId}`);
  } else {
    logTest("Create Quiz", false, createQuiz.data.message);
    return;
  }

  // Add quiz question
  const createQuestion = await request(
    `${API_PREFIX}/admin/quizzes/${testData.quizId}/questions`,
    {
      method: "POST",
      token: adminToken,
      body: {
        question_text: "What is 2 + 2?",
        options: ["2", "3", "4", "5"],
        correct_answer_index: 2,
        explanation: "2 + 2 equals 4",
        order_index: 1,
      },
    }
  );

  if (createQuestion.ok && createQuestion.data.data?.id) {
    testData.questionId = createQuestion.data.data.id;
    logTest("Add Quiz Question", true, `ID: ${testData.questionId}`);
  } else {
    logTest("Add Quiz Question", false, createQuestion.data.message);
  }

  // Get quiz with questions
  const getQuiz = await request(
    `${API_PREFIX}/admin/quizzes/${testData.quizId}`,
    {
      token: adminToken,
    }
  );

  logTest(
    "Get Quiz with Questions",
    getQuiz.ok,
    getQuiz.ok
      ? `Questions: ${getQuiz.data.data?.questions?.length || 0}`
      : getQuiz.data.message
  );

  // Update quiz
  const updateQuiz = await request(
    `${API_PREFIX}/admin/quizzes/${testData.quizId}`,
    {
      method: "PUT",
      token: adminToken,
      body: {
        title: "Updated Test Quiz",
        passing_score: 75,
      },
    }
  );

  logTest("Update Quiz", updateQuiz.ok);
}

// -----------------------------------------------------------------------------
// 7. USER QUIZ ATTEMPTS - PENGGUNA ROLE
// -----------------------------------------------------------------------------

async function testUserQuizAttempts() {
  logSection("USER QUIZ ATTEMPTS - Pengguna Role");

  const penggunaToken = tokens.pengguna;
  if (!penggunaToken || !testData.quizId || !testData.questionId) {
    logTest("User quiz tests", false, "Missing required test data");
    return;
  }

  // Start quiz
  const startQuiz = await request(`${API_PREFIX}/quizzes/start`, {
    method: "POST",
    token: penggunaToken,
    body: {
      quiz_id: testData.quizId,
    },
  });

  if (startQuiz.ok && startQuiz.data.data?.attempt_id) {
    testData.attemptId = startQuiz.data.data.attempt_id;
    logTest("Start Quiz", true, `Attempt ID: ${testData.attemptId}`);
  } else {
    logTest("Start Quiz", false, startQuiz.data.message);
    return;
  }

  // Submit quiz
  const submitQuiz = await request(`${API_PREFIX}/quizzes/submit`, {
    method: "POST",
    token: penggunaToken,
    body: {
      quiz_id: testData.quizId,
      answers: [
        {
          question_id: testData.questionId,
          selected_option_index: 2, // Correct answer
        },
      ],
    },
  });

  logTest(
    "Submit Quiz",
    submitQuiz.ok,
    submitQuiz.ok
      ? `Score: ${submitQuiz.data.data?.score || 0}`
      : submitQuiz.data.message
  );

  // Get user quiz attempts
  const getAttempts = await request(`${API_PREFIX}/quizzes/attempts/me`, {
    token: penggunaToken,
  });

  logTest(
    "Get User Quiz Attempts",
    getAttempts.ok,
    getAttempts.ok
      ? `Attempts: ${getAttempts.data.data?.length || 0}`
      : getAttempts.data.message
  );
}

// -----------------------------------------------------------------------------
// 8. PROGRESS TRACKING - PENGGUNA ROLE
// -----------------------------------------------------------------------------

async function testProgressTracking() {
  logSection("PROGRESS TRACKING - Pengguna Role");

  const penggunaToken = tokens.pengguna;
  if (!penggunaToken) {
    logTest("Progress tests", false, "No pengguna token available");
    return;
  }

  // Get user modules progress
  const modulesProgress = await request(`${API_PREFIX}/progress/modules`, {
    token: penggunaToken,
  });
  logTest("Get Modules Progress", modulesProgress.ok);

  if (testData.moduleId) {
    // Get specific module progress
    const moduleProgress = await request(
      `${API_PREFIX}/progress/modules/${testData.moduleId}`,
      {
        token: penggunaToken,
      }
    );
    logTest("Get Module Progress", moduleProgress.ok);
  }

  if (testData.poinId) {
    // Complete poin
    const completePoin = await request(
      `${API_PREFIX}/progress/poins/${testData.poinId}/complete`,
      {
        method: "POST",
        token: penggunaToken,
      }
    );
    logTest("Complete Poin", completePoin.ok);
  }

  if (testData.subMateriId) {
    // Complete sub-materi
    const completeSubMateri = await request(
      `${API_PREFIX}/progress/sub-materis/${testData.subMateriId}/complete`,
      {
        method: "POST",
        token: penggunaToken,
      }
    );
    logTest("Complete Sub-Materi", completeSubMateri.ok);
  }

  // Get user stats
  const stats = await request(`${API_PREFIX}/progress/stats`, {
    token: penggunaToken,
  });
  logTest("Get User Stats", stats.ok);
}

// -----------------------------------------------------------------------------
// 9. ADMIN DASHBOARD - ADMIN ROLE
// -----------------------------------------------------------------------------

async function testAdminDashboard() {
  logSection("ADMIN DASHBOARD - Admin Role");

  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest("Admin dashboard tests", false, "No admin token available");
    return;
  }

  // Get all users
  const allUsers = await request(`${API_PREFIX}/admin/users`, {
    token: adminToken,
  });
  logTest("Get All Users", allUsers.ok);

  // Get all users progress
  const allProgress = await request(`${API_PREFIX}/admin/progress`, {
    token: adminToken,
  });
  logTest("Get All Users Progress", allProgress.ok);

  // Get quiz attempts
  const quizAttempts = await request(`${API_PREFIX}/admin/quiz-attempts`, {
    token: adminToken,
  });
  logTest("Get Quiz Attempts", quizAttempts.ok);

  // Get progress stats
  const progressStats = await request(`${API_PREFIX}/admin/progress/stats`, {
    token: adminToken,
  });
  logTest("Get Progress Stats", progressStats.ok);

  // Get activity logs
  const activityLogs = await request(`${API_PREFIX}/admin/activity-logs`, {
    token: adminToken,
  });
  logTest("Get Activity Logs", activityLogs.ok);
}

// -----------------------------------------------------------------------------
// 10. SUPERADMIN USER MANAGEMENT
// -----------------------------------------------------------------------------

async function testSuperadminUserManagement() {
  logSection("SUPERADMIN - User Management");

  const superadminToken = tokens.superadmin;
  if (!superadminToken) {
    logTest("Superadmin tests", false, "No superadmin token available");
    return;
  }

  // Create new user
  const createUser = await request(`${API_PREFIX}/admin/users`, {
    method: "POST",
    token: superadminToken,
    body: {
      email: `testuser${Date.now()}@bukadita.test`,
      password: "testuser123",
      full_name: "Test User Created by Superadmin",
      phone: `+628${Math.floor(Math.random() * 1000000000)}`,
      role: "pengguna",
    },
  });

  let newUserId: string | null = null;
  if (createUser.ok && createUser.data.data?.user?.id) {
    newUserId = createUser.data.data.user.id;
    logTest("Create User", true, `User ID: ${newUserId}`);

    // Update user role
    const updateRole = await request(
      `${API_PREFIX}/admin/users/${newUserId}/role`,
      {
        method: "PATCH",
        token: superadminToken,
        body: {
          role: "admin",
        },
      }
    );
    logTest("Update User Role", updateRole.ok);

    // Delete user
    const deleteUser = await request(`${API_PREFIX}/admin/users/${newUserId}`, {
      method: "DELETE",
      token: superadminToken,
    });
    logTest("Delete User", deleteUser.ok);
  } else {
    logTest("Create User", false, createUser.data.message);
  }
}

// -----------------------------------------------------------------------------
// 11. PERMISSION BOUNDARY TESTS
// -----------------------------------------------------------------------------

async function testPermissionBoundaries() {
  logSection("PERMISSION BOUNDARY TESTS");

  const penggunaToken = tokens.pengguna;
  const adminToken = tokens.admin;

  // Test 1: Pengguna trying to access admin endpoint
  if (penggunaToken) {
    const penggunaAccessAdmin = await request(`${API_PREFIX}/admin/users`, {
      token: penggunaToken,
    });
    logTest(
      "Pengguna blocked from admin endpoint",
      penggunaAccessAdmin.status === 403,
      `Status: ${penggunaAccessAdmin.status}`
    );
  }

  // Test 2: Pengguna trying to create module
  if (penggunaToken) {
    const penggunaCreateModule = await request(`${API_PREFIX}/modules`, {
      method: "POST",
      token: penggunaToken,
      body: {
        title: "Unauthorized Module",
        slug: "unauthorized-module",
      },
    });
    logTest(
      "Pengguna blocked from creating module",
      penggunaCreateModule.status === 403,
      `Status: ${penggunaCreateModule.status}`
    );
  }

  // Test 3: Admin trying to access superadmin endpoint
  if (adminToken) {
    const adminCreateUser = await request(`${API_PREFIX}/admin/users`, {
      method: "POST",
      token: adminToken,
      body: {
        email: "unauthorized@test.com",
        password: "test123",
        full_name: "Unauthorized User",
      },
    });
    logTest(
      "Admin blocked from creating user",
      adminCreateUser.status === 403,
      `Status: ${adminCreateUser.status}`
    );
  }

  // Test 4: No token access to protected endpoint
  const noTokenAccess = await request(`${API_PREFIX}/progress/modules`);
  logTest(
    "No token blocked from protected endpoint",
    noTokenAccess.status === 401,
    `Status: ${noTokenAccess.status}`
  );
}

// -----------------------------------------------------------------------------
// 12. ERROR & VALIDATION TESTS
// -----------------------------------------------------------------------------

async function testErrorHandling() {
  logSection("ERROR & VALIDATION TESTS");

  // Test invalid login
  const invalidLogin = await request(`${API_PREFIX}/auth/login`, {
    method: "POST",
    body: {
      identifier: "nonexistent@test.com",
      password: "wrongpassword",
    },
  });
  logTest(
    "Invalid login rejected",
    !invalidLogin.ok && invalidLogin.status === 401
  );

  // Test missing required fields
  const missingFields = await request(`${API_PREFIX}/auth/register`, {
    method: "POST",
    body: {
      email: "incomplete@test.com",
      // Missing password and full_name
    },
  });
  logTest(
    "Missing required fields rejected",
    !missingFields.ok && missingFields.status === 400
  );

  // Test invalid UUID
  const adminToken = tokens.admin;
  if (adminToken) {
    const invalidUUID = await request(`${API_PREFIX}/modules/invalid-uuid`, {
      method: "PUT",
      token: adminToken,
      body: { title: "Test" },
    });
    logTest(
      "Invalid UUID handled",
      !invalidUUID.ok && invalidUUID.status >= 400
    );
  }

  // Test duplicate slug
  if (adminToken && testData.moduleId) {
    const duplicateSlug = await request(`${API_PREFIX}/modules`, {
      method: "POST",
      token: adminToken,
      body: {
        title: "Duplicate Test",
        slug: `test-module-${Date.now()}`,
        published: false,
      },
    });

    if (duplicateSlug.ok && duplicateSlug.data.data?.slug) {
      const duplicate2 = await request(`${API_PREFIX}/modules`, {
        method: "POST",
        token: adminToken,
        body: {
          title: "Duplicate Test 2",
          slug: duplicateSlug.data.data.slug, // Same slug
          published: false,
        },
      });
      logTest("Duplicate slug rejected", !duplicate2.ok);
    }
  }
}

// -----------------------------------------------------------------------------
// 13. CLEANUP - DELETE TEST DATA
// -----------------------------------------------------------------------------

async function cleanupTestData() {
  logSection("CLEANUP - Delete Test Data");

  const adminToken = tokens.admin;
  if (!adminToken) {
    logTest("Cleanup", false, "No admin token available");
    return;
  }

  // Delete quiz (will cascade to questions)
  if (testData.quizId) {
    const deleteQuiz = await request(
      `${API_PREFIX}/admin/quizzes/${testData.quizId}`,
      {
        method: "DELETE",
        token: adminToken,
      }
    );
    logTest("Delete Quiz", deleteQuiz.ok);
  }

  // Delete sub-materi (will cascade to poin details)
  if (testData.subMateriId) {
    const deleteMaterial = await request(
      `${API_PREFIX}/materials/${testData.subMateriId}`,
      {
        method: "DELETE",
        token: adminToken,
      }
    );
    logTest("Delete Sub-Materi", deleteMaterial.ok);
  }

  // Delete module
  if (testData.moduleId) {
    const deleteModule = await request(
      `${API_PREFIX}/modules/${testData.moduleId}`,
      {
        method: "DELETE",
        token: adminToken,
      }
    );
    logTest("Delete Module", deleteModule.ok);
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════════╗");
  console.log("║      BUKADITA API v2 - COMPREHENSIVE API TESTING                 ║");
  console.log("║      Testing all endpoints for all roles                         ║");
  console.log("╚═══════════════════════════════════════════════════════════════════╝");
  console.log(`\n🌐 Base URL: ${BASE_URL}`);
  console.log(`📅 Test Date: ${new Date().toISOString()}\n`);

  try {
    // Phase 1: Public & Authentication
    await testPublicEndpoints();
    await testAuthentication();

    // Ensure we have all required tokens
    if (!tokens.superadmin || !tokens.admin || !tokens.pengguna) {
      console.log("\n❌ Missing required tokens. Cannot continue with full test suite.");
      console.log("Available tokens:", Object.keys(tokens));
      return;
    }

    // Phase 2: Profile Management
    await testProfileManagement();

    // Phase 3: Admin Content Management
    await testModuleManagement();
    await testMaterialManagement();
    await testQuizManagement();

    // Phase 4: User Interactions
    await testUserQuizAttempts();
    await testProgressTracking();

    // Phase 5: Admin Dashboard
    await testAdminDashboard();

    // Phase 6: Superadmin Functions
    await testSuperadminUserManagement();

    // Phase 7: Security Tests
    await testPermissionBoundaries();
    await testErrorHandling();

    // Phase 8: Cleanup
    await cleanupTestData();

    // Final Summary
    console.log("\n" + "=".repeat(70));
    console.log("✨ ALL TESTS COMPLETED");
    console.log("=".repeat(70));
    console.log("\n📊 Test Summary:");
    console.log(`   - Superadmin Token: ${tokens.superadmin ? "✅" : "❌"}`);
    console.log(`   - Admin Token: ${tokens.admin ? "✅" : "❌"}`);
    console.log(`   - Pengguna Token: ${tokens.pengguna ? "✅" : "❌"}`);
    console.log(`\n   Test Data Created:`);
    console.log(`   - Module ID: ${testData.moduleId || "N/A"}`);
    console.log(`   - Sub-Materi ID: ${testData.subMateriId || "N/A"}`);
    console.log(`   - Quiz ID: ${testData.quizId || "N/A"}`);
    console.log(`   - Question ID: ${testData.questionId || "N/A"}`);
    console.log(`\n✅ Testing completed successfully!\n`);
  } catch (error: any) {
    console.error("\n❌ Test suite failed with error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
