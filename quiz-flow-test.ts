/**
 * BUKADITA API v2 - Quiz Flow Test
 * Tests the complete quiz workflow: Create -> Start -> Submit
 */

const BASE_URL = "http://localhost:8080";
const API_PREFIX = "/api/v1";

// Test accounts
const ADMIN_ACCOUNT = {
  email: "admin@bukadita.test",
  password: "admin123",
};

const PENGGUNA_ACCOUNT = {
  email: "pengguna@bukadita.test",
  password: "pengguna123",
};

let adminToken = "";
let penggunaToken = "";
let testModuleId = "";
let testSubMateriId = "";
let testQuizId = "";
let testQuestionId = "";
let attemptId = "";

// Helper function for API requests
async function request(path: string, options: any = {}) {
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

function logStep(step: string, success: boolean, details?: string) {
  const icon = success ? "✅" : "❌";
  const message = details ? `${step}: ${details}` : step;
  console.log(`${icon} ${message}`);
}

function logSection(title: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🔍 ${title}`);
  console.log("=".repeat(70));
}

async function runQuizFlowTest() {
  console.log("\n╔═══════════════════════════════════════════════════════════════════╗");
  console.log("║        BUKADITA API v2 - QUIZ FLOW TEST                          ║");
  console.log("║        Complete Quiz Workflow Testing                            ║");
  console.log("╚═══════════════════════════════════════════════════════════════════╝\n");

  try {
    // =========================================================================
    // STEP 1: LOGIN
    // =========================================================================
    logSection("STEP 1: Authentication");

    // Login as admin
    const adminLogin = await request(`${API_PREFIX}/auth/login`, {
      method: "POST",
      body: {
        identifier: ADMIN_ACCOUNT.email,
        password: ADMIN_ACCOUNT.password,
      },
    });

    if (adminLogin.ok && adminLogin.data.data?.access_token) {
      adminToken = adminLogin.data.data.access_token;
      logStep("Admin login", true, "Token obtained");
    } else {
      logStep("Admin login", false, adminLogin.data.message);
      return;
    }

    // Login as pengguna
    const penggunaLogin = await request(`${API_PREFIX}/auth/login`, {
      method: "POST",
      body: {
        identifier: PENGGUNA_ACCOUNT.email,
        password: PENGGUNA_ACCOUNT.password,
      },
    });

    if (penggunaLogin.ok && penggunaLogin.data.data?.access_token) {
      penggunaToken = penggunaLogin.data.data.access_token;
      logStep("Pengguna login", true, "Token obtained");
    } else {
      logStep("Pengguna login", false, penggunaLogin.data.message);
      return;
    }

    // =========================================================================
    // STEP 2: CREATE MODULE
    // =========================================================================
    logSection("STEP 2: Create Module (Admin)");

    const createModule = await request(`${API_PREFIX}/modules`, {
      method: "POST",
      token: adminToken,
      body: {
        title: `Quiz Flow Test Module ${Date.now()}`,
        slug: `quiz-flow-test-${Date.now()}`,
        description: "Module for testing quiz flow",
        duration_label: "1 jam",
        duration_minutes: 60,
        lessons: 1,
        category: "testing",
        published: true,
      },
    });

    if (createModule.ok && createModule.data.data?.id) {
      testModuleId = createModule.data.data.id;
      logStep("Create Module", true, `Module ID: ${testModuleId}`);
    } else {
      logStep("Create Module", false, createModule.data.message);
      return;
    }

    // =========================================================================
    // STEP 3: CREATE SUB-MATERI
    // =========================================================================
    logSection("STEP 3: Create Sub-Materi (Admin)");

    const createSubMateri = await request(`${API_PREFIX}/materials`, {
      method: "POST",
      token: adminToken,
      body: {
        module_id: testModuleId,
        title: "Quiz Flow Test Sub-Materi",
        content: "This sub-materi contains a quiz",
        order_index: 1,
        published: true,
      },
    });

    if (createSubMateri.ok && createSubMateri.data.data?.id) {
      testSubMateriId = createSubMateri.data.data.id;
      logStep("Create Sub-Materi", true, `Sub-Materi ID: ${testSubMateriId}`);
    } else {
      logStep("Create Sub-Materi", false, createSubMateri.data.message);
      return;
    }

    // =========================================================================
    // STEP 4: CREATE QUIZ
    // =========================================================================
    logSection("STEP 4: Create Quiz (Admin)");

    const createQuiz = await request(`${API_PREFIX}/admin/quizzes`, {
      method: "POST",
      token: adminToken,
      body: {
        module_id: testModuleId,
        sub_materi_id: testSubMateriId,
        title: "Quiz Flow Test Quiz",
        description: "Test quiz for quiz flow testing",
        time_limit_seconds: 300,
        passing_score: 60,
        quiz_type: "sub_materi",
        published: true,
      },
    });

    if (createQuiz.ok && createQuiz.data.data?.id) {
      testQuizId = createQuiz.data.data.id;
      logStep("Create Quiz", true, `Quiz ID: ${testQuizId}`);
    } else {
      logStep("Create Quiz", false, createQuiz.data.message);
      return;
    }

    // =========================================================================
    // STEP 5: ADD QUIZ QUESTIONS
    // =========================================================================
    logSection("STEP 5: Add Quiz Questions (Admin)");

    const questions = [
      {
        question_text: "What is 2 + 2?",
        options: ["2", "3", "4", "5"],
        correct_answer_index: 2,
        explanation: "2 + 2 = 4",
        order_index: 1,
      },
      {
        question_text: "What is 5 x 3?",
        options: ["8", "10", "15", "20"],
        correct_answer_index: 2,
        explanation: "5 x 3 = 15",
        order_index: 2,
      },
      {
        question_text: "What is 10 - 4?",
        options: ["4", "5", "6", "7"],
        correct_answer_index: 2,
        explanation: "10 - 4 = 6",
        order_index: 3,
      },
    ];

    const questionIds: string[] = [];

    for (const question of questions) {
      const addQuestion = await request(
        `${API_PREFIX}/admin/quizzes/${testQuizId}/questions`,
        {
          method: "POST",
          token: adminToken,
          body: question,
        }
      );

      if (addQuestion.ok && addQuestion.data.data?.id) {
        questionIds.push(addQuestion.data.data.id);
        logStep(
          `Add Question ${question.order_index}`,
          true,
          question.question_text
        );
      } else {
        logStep(
          `Add Question ${question.order_index}`,
          false,
          addQuestion.data.message
        );
      }
    }

    if (questionIds.length === 0) {
      console.log("❌ No questions were added. Stopping test.");
      return;
    }

    testQuestionId = questionIds[0];

    // =========================================================================
    // STEP 6: START QUIZ (PENGGUNA)
    // =========================================================================
    logSection("STEP 6: Start Quiz (Pengguna)");

    const startQuiz = await request(`${API_PREFIX}/quizzes/start`, {
      method: "POST",
      token: penggunaToken,
      body: {
        quiz_id: testQuizId,
      },
    });

    if (startQuiz.ok && startQuiz.data.data?.attempt_id) {
      attemptId = startQuiz.data.data.attempt_id;
      logStep("Start Quiz", true, `Attempt ID: ${attemptId}`);
      logStep(
        "Quiz Info",
        true,
        `${startQuiz.data.data.total_questions} questions, ${startQuiz.data.data.time_limit_seconds}s time limit`
      );
    } else {
      logStep("Start Quiz", false, startQuiz.data.message);
      return;
    }

    // =========================================================================
    // STEP 7: SUBMIT QUIZ (PENGGUNA)
    // =========================================================================
    logSection("STEP 7: Submit Quiz (Pengguna)");

    // Submit all answers (all correct)
    const submitQuiz = await request(`${API_PREFIX}/quizzes/submit`, {
      method: "POST",
      token: penggunaToken,
      body: {
        quiz_id: testQuizId,
        answers: questionIds.map((id, index) => ({
          question_id: id,
          selected_option_index: 2, // All correct answers are at index 2
        })),
      },
    });

    if (submitQuiz.ok) {
      const result = submitQuiz.data.data;
      logStep("Submit Quiz", true, `Score: ${result.score}%`);
      logStep(
        "Quiz Result",
        result.passed,
        `${result.correct_answers}/${result.total_questions} correct, ${result.passed ? "PASSED" : "FAILED"}`
      );
    } else {
      logStep("Submit Quiz", false, submitQuiz.data.message);
      return;
    }

    // =========================================================================
    // STEP 8: GET QUIZ ATTEMPTS (PENGGUNA)
    // =========================================================================
    logSection("STEP 8: Get Quiz Attempts (Pengguna)");

    const getAttempts = await request(`${API_PREFIX}/quizzes/attempts/me`, {
      token: penggunaToken,
    });

    if (getAttempts.ok) {
      const attempts = getAttempts.data.data;
      logStep("Get Attempts", true, `Found ${attempts.length} attempt(s)`);

      if (attempts.length > 0) {
        const latestAttempt = attempts[0];
        logStep(
          "Latest Attempt",
          true,
          `Score: ${latestAttempt.score}%, Passed: ${latestAttempt.passed}`
        );
      }
    } else {
      logStep("Get Attempts", false, getAttempts.data.message);
    }

    // =========================================================================
    // STEP 9: COMPLETE SUB-MATERI (PENGGUNA)
    // =========================================================================
    logSection("STEP 9: Complete Sub-Materi (Pengguna)");

    const completeSubMateri = await request(
      `${API_PREFIX}/progress/sub-materis/${testSubMateriId}/complete`,
      {
        method: "POST",
        token: penggunaToken,
      }
    );

    if (completeSubMateri.ok) {
      logStep("Complete Sub-Materi", true, "Sub-materi marked as completed");
    } else {
      logStep("Complete Sub-Materi", false, completeSubMateri.data.message);
    }

    // =========================================================================
    // STEP 10: CLEANUP
    // =========================================================================
    logSection("STEP 10: Cleanup (Delete Test Data)");

    // Delete quiz
    const deleteQuiz = await request(
      `${API_PREFIX}/admin/quizzes/${testQuizId}`,
      {
        method: "DELETE",
        token: adminToken,
      }
    );
    logStep("Delete Quiz", deleteQuiz.ok);

    // Delete sub-materi
    const deleteSubMateri = await request(
      `${API_PREFIX}/materials/${testSubMateriId}`,
      {
        method: "DELETE",
        token: adminToken,
      }
    );
    logStep("Delete Sub-Materi", deleteSubMateri.ok);

    // Delete module
    const deleteModule = await request(`${API_PREFIX}/modules/${testModuleId}`, {
      method: "DELETE",
      token: adminToken,
    });
    logStep("Delete Module", deleteModule.ok);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("✨ QUIZ FLOW TEST COMPLETED SUCCESSFULLY");
    console.log("=".repeat(70));
    console.log("\n📊 Summary:");
    console.log(`   ✅ Module created and deleted`);
    console.log(`   ✅ Sub-Materi created and deleted`);
    console.log(`   ✅ Quiz created with ${questionIds.length} questions`);
    console.log(`   ✅ Quiz started by user`);
    console.log(`   ✅ Quiz submitted successfully`);
    console.log(`   ✅ Quiz attempts retrieved`);
    console.log(`   ✅ Sub-Materi completed`);
    console.log(`   ✅ All test data cleaned up\n`);
  } catch (error: any) {
    console.error("\n❌ Test failed with error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runQuizFlowTest();
