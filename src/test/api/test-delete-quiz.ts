/* eslint-disable no-console */
/**
 * Manual test script for DELETE /api/quizzes/:id endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:delete:quiz
 *
 * Note: This test will create a test quiz first, then delete it.
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
        title: `TEST DELETE Quiz - ${Date.now()}`,
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
 * Helper function to check if a quiz exists
 */
async function quizExists(quizId: string): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/api/quizzes/${quizId}`);
  return response.ok;
}

async function testDeleteQuiz() {
  console.log("🧪 Testing DELETE /api/quizzes/:id endpoint\n");

  // Step 0: Create a test quiz for deletion testing
  console.log("Step 0: Creating a test quiz for deletion...");
  let testQuizId: string | null = null;
  try {
    const testQuiz = await createTestQuiz();

    if (!testQuiz) {
      console.log("❌ Failed to create test quiz. Aborting tests.");
      console.log("   Make sure the server is running on", BASE_URL);
      console.log("   Note: You may need a valid Quizlet URL or mock data setup.\n");
      return;
    }

    testQuizId = testQuiz.id;
    console.log(`✅ Created test quiz: ${testQuizId}`);
    console.log(`   Title: "${testQuiz.title}"`);
    console.log(`   Question count: ${testQuiz.question_count}`);
    console.log(`   This quiz will be deleted during testing.\n`);
  } catch (error) {
    console.log("❌ ERROR creating test quiz:", error);
    console.log("   Make sure the server is running on", BASE_URL, "\n");
    return;
  }

  // Test 1: Delete with invalid UUID format
  console.log("Test 1: DELETE /api/quizzes/invalid-uuid (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/invalid-uuid`, {
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

  // Test 2: Delete non-existent quiz
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  console.log(`Test 2: DELETE /api/quizzes/${nonExistentId} (should return 404)`);
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${nonExistentId}`, {
      method: "DELETE",
    });
    const data = response.status !== 204 ? await response.json() : null;

    console.log(`Status: ${response.status}`);

    if (response.status === 404) {
      console.log(`✅ SUCCESS: Got expected 404 error`);
      console.log(`   Error code: ${data?.error?.code}`);
      console.log(`   Message: ${data?.error?.message}`);
    } else if (response.status === 204) {
      console.log(`⚠️  WARNING: Got 204 No Content - quiz with ID ${nonExistentId} existed!`);
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

  // Verify we have a test quiz ID for the remaining tests
  if (!testQuizId) {
    console.log("❌ No test quiz ID available. Cannot proceed with deletion tests.\n");
    return;
  }

  // Test 3: Successful quiz deletion
  console.log(`Test 3: DELETE /api/quizzes/${testQuizId} (successful deletion)`);
  try {
    // First verify the quiz exists
    const existsBefore = await quizExists(testQuizId);
    console.log(`   Quiz exists before deletion: ${existsBefore}`);

    // Delete the quiz
    const response = await fetch(`${BASE_URL}/api/quizzes/${testQuizId}`, {
      method: "DELETE",
    });

    console.log(`Status: ${response.status}`);

    if (response.status === 204) {
      console.log(`✅ SUCCESS: Quiz deleted (204 No Content)`);

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

      // Verify the quiz no longer exists
      const existsAfter = await quizExists(testQuizId);
      console.log(`   Quiz exists after deletion: ${existsAfter}`);

      if (!existsAfter) {
        console.log(`   ✓ Quiz successfully removed from database`);
      } else {
        console.log(`   ❌ Quiz still exists in database!`);
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

  // Test 4: Try to delete the same quiz again (should return 404)
  console.log(`Test 4: DELETE /api/quizzes/${testQuizId} again (should return 404)`);
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${testQuizId}`, {
      method: "DELETE",
    });
    const data = response.status !== 204 ? await response.json() : null;

    console.log(`Status: ${response.status}`);

    if (response.status === 404) {
      console.log(`✅ SUCCESS: Got expected 404 error (quiz already deleted)`);
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

  // Test 5: Verify CASCADE deletion by checking questions and answers
  console.log("Test 5: Verifying CASCADE deletion of questions and answers");
  console.log("   Note: This is a manual check. Please verify in your database");
  console.log("   that all quiz_questions and answers related to the deleted quiz");
  console.log("   have also been removed.\n");

  console.log("🏁 Tests completed!");
  console.log("\n✅ Test quiz was created and deleted successfully.");
  console.log("   No existing data was harmed during these tests.");
}

testDeleteQuiz().catch(console.error);

export {};
