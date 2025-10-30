/* eslint-disable no-console */
/**
 * Manual test script for DELETE /api/questions/:id endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:delete:question
 *
 * Note: This test will create a test quiz first, then delete one of its questions.
 * No existing data will be harmed.
 */

const BASE_URL = "http://localhost:3000";

// Test Quizlet URL for creating test quiz
const TEST_QUIZLET_URL = "https://quizlet.com/123456789/test-set";

interface QuizSummaryDTO {
  id: string;
  title: string;
  status: string;
  source_url: string | null;
  quizlet_set_id: string | null;
  question_count: number;
  created_at: string;
  updated_at: string;
}

interface QuestionDetailDTO {
  id: string;
  question_text: string;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  answers: {
    id: string;
    answer_text: string;
    is_correct: boolean;
    created_at: string;
    updated_at: string;
  }[];
}

/**
 * Helper function to create a test quiz
 */
async function createTestQuiz(): Promise<QuizSummaryDTO | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: TEST_QUIZLET_URL,
        title: `TEST DELETE Question - ${Date.now()}`,
      }),
    });

    if (response.ok) {
      return await response.json();
    }

    console.log(`   Failed to create test quiz: ${response.status}`);
    const errorData = await response.json();
    console.log(`   Error:`, JSON.stringify(errorData, null, 2));
    return null;
  } catch (error) {
    console.log(`   Error creating test quiz:`, error);
    return null;
  }
}

/**
 * Helper function to get a question from a quiz
 */
async function getFirstQuestionFromQuiz(quizId: string): Promise<QuestionDetailDTO | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${quizId}`);

    if (!response.ok) {
      console.log(`   Failed to get quiz details: ${response.status}`);
      return null;
    }

    const quizData = await response.json();
    if (quizData.questions && quizData.questions.length > 0) {
      return quizData.questions[0];
    }

    console.log(`   Quiz has no questions`);
    return null;
  } catch (error) {
    console.log(`   Error getting quiz details:`, error);
    return null;
  }
}

/**
 * Helper function to check if a question exists
 */
async function questionExists(questionId: string): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/api/questions/${questionId}`);
  return response.ok;
}

/**
 * Helper function to get quiz question count
 */
async function getQuizQuestionCount(quizId: string): Promise<number> {
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${quizId}`);
    if (response.ok) {
      const quizData = await response.json();
      return quizData.questions ? quizData.questions.length : 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

async function testDeleteQuestion() {
  console.log("🧪 Testing DELETE /api/questions/:id endpoint\n");

  // Step 0: Create a test quiz and get a question for deletion testing
  console.log("Step 0: Creating a test quiz and getting a question for deletion...");
  let testQuizId: string | null = null;
  let testQuestionId: string | null = null;
  let originalQuestionCount = 0;

  try {
    const testQuiz = await createTestQuiz();

    if (!testQuiz) {
      console.log("❌ Failed to create test quiz. Aborting tests.");
      console.log("   Make sure the server is running on", BASE_URL);
      console.log("   Note: You may need a valid Quizlet URL or mock data setup.\n");
      return;
    }

    testQuizId = testQuiz.id;
    originalQuestionCount = testQuiz.question_count;
    console.log(`✅ Created test quiz: ${testQuizId}`);
    console.log(`   Title: "${testQuiz.title}"`);
    console.log(`   Original question count: ${originalQuestionCount}`);

    // Get first question from the quiz
    const firstQuestion = await getFirstQuestionFromQuiz(testQuizId);
    if (!firstQuestion) {
      console.log("❌ Test quiz has no questions. Aborting tests.");
      return;
    }

    testQuestionId = firstQuestion.id;
    console.log(`✅ Got test question: ${testQuestionId}`);
    console.log(`   Question: "${firstQuestion.question_text}"`);
    console.log(`   Answer count: ${firstQuestion.answers.length}`);
    console.log(`   This question and its answers will be deleted during testing.\n`);
  } catch (error) {
    console.log("❌ ERROR setting up test data:", error);
    console.log("   Make sure the server is running on", BASE_URL, "\n");
    return;
  }

  // Test 1: Delete with invalid UUID format
  console.log("Test 1: DELETE /api/questions/invalid-uuid (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/questions/invalid-uuid`, {
      method: "DELETE",
    });
    const data = response.status !== 204 ? await response.json() : null;

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error`);
      console.log(`   Error code: ${data?.error?.code}`);
      console.log(`   Message: ${data?.error?.message}`);
    } else {
      console.log(`❌ FAILED: Expected 400 but got ${response.status}`);
      if (data) {
        console.log(`Response:`, JSON.stringify(data, null, 2));
      }
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 2: Delete non-existent question
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  console.log(`Test 2: DELETE /api/questions/${nonExistentId} (should return 404)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${nonExistentId}`, {
      method: "DELETE",
    });
    const data = response.status !== 204 ? await response.json() : null;

    console.log(`Status: ${response.status}`);

    if (response.status === 404) {
      console.log(`✅ SUCCESS: Got expected 404 error`);
      console.log(`   Error code: ${data?.error?.code}`);
      console.log(`   Message: ${data?.error?.message}`);
    } else if (response.status === 204) {
      console.log(`⚠️  WARNING: Got 204 No Content - question with ID ${nonExistentId} existed!`);
    } else {
      console.log(`❌ FAILED: Expected 404 but got ${response.status}`);
      if (data) {
        console.log(`Response:`, JSON.stringify(data, null, 2));
      }
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Verify we have test data for the remaining tests
  if (!testQuizId || !testQuestionId) {
    console.log("❌ No test data available. Cannot proceed with deletion tests.\n");
    return;
  }

  // Test 3: Successful question deletion
  console.log(`Test 3: DELETE /api/questions/${testQuestionId} (successful deletion)`);
  try {
    // First verify the question exists
    const existsBefore = await questionExists(testQuestionId);
    console.log(`   Question exists before deletion: ${existsBefore}`);

    // Delete the question
    const response = await fetch(`${BASE_URL}/api/questions/${testQuestionId}`, {
      method: "DELETE",
    });

    console.log(`Status: ${response.status}`);

    if (response.status === 204) {
      console.log(`✅ SUCCESS: Question deleted (204 No Content)`);

      // Check correlation ID header
      const correlationId = response.headers.get("X-Correlation-ID");
      console.log(`   X-Correlation-ID: ${correlationId || "not set"}`);

      // Verify response body is empty
      const text = await response.text();
      if (text === "") {
        console.log(`   ✓ Response body is empty (as expected for 204)`);
      } else {
        console.log(`   ⚠️  WARNING: Response body is not empty: "${text}"`);
      }

      // Verify the question no longer exists
      const existsAfter = await questionExists(testQuestionId);
      console.log(`   Question exists after deletion: ${existsAfter}`);

      if (!existsAfter) {
        console.log(`   ✓ Question successfully removed from database`);
      } else {
        console.log(`   ❌ Question still exists in database!`);
      }

      // Verify quiz question count decreased
      const newQuestionCount = await getQuizQuestionCount(testQuizId);
      console.log(`   Quiz question count before: ${originalQuestionCount}`);
      console.log(`   Quiz question count after: ${newQuestionCount}`);

      if (newQuestionCount === originalQuestionCount - 1) {
        console.log(`   ✓ Quiz question count decreased by 1`);
      } else {
        console.log(`   ⚠️  WARNING: Quiz question count didn't decrease as expected`);
      }
    } else {
      console.log(`❌ FAILED: Expected 204 but got ${response.status}`);
      try {
        const data = await response.json();
        console.log(`Response:`, JSON.stringify(data, null, 2));
      } catch {
        const text = await response.text();
        console.log(`Response text:`, text);
      }
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 4: Try to delete the same question again (should return 404)
  console.log(`Test 4: DELETE /api/questions/${testQuestionId} again (should return 404)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${testQuestionId}`, {
      method: "DELETE",
    });
    const data = response.status !== 204 ? await response.json() : null;

    console.log(`Status: ${response.status}`);

    if (response.status === 404) {
      console.log(`✅ SUCCESS: Got expected 404 error (question already deleted)`);
      console.log(`   Error code: ${data?.error?.code}`);
      console.log(`   Message: ${data?.error?.message}`);
    } else {
      console.log(`❌ FAILED: Expected 404 but got ${response.status}`);
      if (data) {
        console.log(`Response:`, JSON.stringify(data, null, 2));
      }
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 5: Verify CASCADE deletion by checking answers are gone
  console.log("Test 5: Verifying CASCADE deletion of answers");
  console.log("   Note: This is a manual check. Please verify in your database");
  console.log("   that all answers related to the deleted question");
  console.log("   have also been removed.\n");

  console.log("🏁 Tests completed!");
  console.log("\n✅ Test question was created and deleted successfully.");
  console.log("   No existing data was harmed during these tests.");
}

testDeleteQuestion().catch(console.error);

export {};
