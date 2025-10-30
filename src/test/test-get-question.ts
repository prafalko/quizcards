/* eslint-disable no-console */
/**
 * Manual test script for GET /api/questions/:id endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:get:question
 *
 * Prerequisites:
 * - You need a valid question ID from an existing quiz
 * - The quiz must belong to the default user (SUPABASE_DEFAULT_USER_ID)
 * - You can get question IDs by first calling GET /api/quizzes/:id
 */

const BASE_URL = "http://localhost:3000";

interface QuestionDetail {
  id: string;
  question_text: string;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  answers: {
    id: string;
    answer_text: string;
    is_correct: boolean;
    source: string;
  }[];
}

/**
 * Helper function to get the first question ID from a quiz
 */
async function getFirstQuestionId(): Promise<string | null> {
  try {
    // First, get all quizzes
    const quizzesResponse = await fetch(`${BASE_URL}/api/quizzes`);
    if (!quizzesResponse.ok) {
      console.log("❌ Failed to fetch quizzes");
      return null;
    }

    const quizzes = await quizzesResponse.json();
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      console.log("❌ No quizzes found");
      return null;
    }

    // Get the first quiz with questions
    const quizWithQuestions = quizzes.find((q: { question_count: number }) => q.question_count > 0);
    if (!quizWithQuestions) {
      console.log("❌ No quiz with questions found");
      return null;
    }

    // Fetch the full quiz details
    const quizResponse = await fetch(`${BASE_URL}/api/quizzes/${quizWithQuestions.id}`);
    if (!quizResponse.ok) {
      console.log("❌ Failed to fetch quiz details");
      return null;
    }

    const quiz = await quizResponse.json();
    if (!quiz.questions || quiz.questions.length === 0) {
      console.log("❌ Quiz has no questions");
      return null;
    }

    return quiz.questions[0].id;
  } catch (error) {
    console.log("❌ Error getting question ID:", error);
    return null;
  }
}

async function testGetQuestion() {
  console.log("🧪 Testing GET /api/questions/:id endpoint\n");

  // Get a valid question ID first
  console.log("📋 Finding a valid question ID...");
  const questionId = await getFirstQuestionId();

  if (!questionId) {
    console.log("\n⚠️  Could not find a valid question ID.");
    console.log("   Please create a quiz first using POST /api/quizzes/generate");
    console.log("   Example: npm run test:generate");
    return;
  }

  console.log(`✅ Found question ID: ${questionId}\n`);

  // Test 1: Get valid question
  console.log("Test 1: GET /api/questions/:id (valid ID)");
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${questionId}`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.ok) {
      const question = data as QuestionDetail;
      console.log(`✅ SUCCESS: Got question "${question.question_text.substring(0, 50)}..."`);
      console.log(`   - ID: ${question.id}`);
      console.log(`   - Answers: ${question.answers.length}`);
      console.log(
        `   - Correct answer: ${question.answers.find((a) => a.is_correct)?.answer_text.substring(0, 50)}...`
      );

      // Verify structure
      if (!question.id || !question.question_text || !Array.isArray(question.answers)) {
        console.log(`❌ WARNING: Response structure is invalid`);
      }
    } else {
      console.log(`❌ FAILED: Expected 200 status`);
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 2: Invalid UUID format
  console.log("Test 2: GET /api/questions/:id (invalid UUID format)");
  try {
    const invalidId = "not-a-uuid";
    const response = await fetch(`${BASE_URL}/api/questions/${invalidId}`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for invalid UUID`);
      if (data.error && data.error.code === "VALIDATION_ERROR") {
        console.log(`   - Error code: ${data.error.code}`);
      }
    } else {
      console.log(`❌ FAILED: Expected 400 status, got ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 3: Non-existent question ID
  console.log("Test 3: GET /api/questions/:id (non-existent question)");
  try {
    const nonExistentId = "00000000-0000-0000-0000-000000000000";
    const response = await fetch(`${BASE_URL}/api/questions/${nonExistentId}`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 404) {
      console.log(`✅ SUCCESS: Got expected 404 error for non-existent question`);
      if (data.error && data.error.code === "NOT_FOUND") {
        console.log(`   - Error code: ${data.error.code}`);
      }
    } else {
      console.log(`❌ FAILED: Expected 404 status, got ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 4: Verify response headers
  console.log("Test 4: Verify response headers");
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${questionId}`);

    console.log(`Status: ${response.status}`);
    const contentType = response.headers.get("content-type");
    const cacheControl = response.headers.get("cache-control");
    const correlationId = response.headers.get("x-correlation-id");

    console.log(`Headers:`);
    console.log(`   - Content-Type: ${contentType}`);
    console.log(`   - Cache-Control: ${cacheControl}`);
    console.log(`   - X-Correlation-ID: ${correlationId}`);

    if (contentType === "application/json") {
      console.log(`✅ SUCCESS: Correct Content-Type header`);
    } else {
      console.log(`❌ WARNING: Expected application/json Content-Type`);
    }

    if (cacheControl?.includes("no-cache")) {
      console.log(`✅ SUCCESS: Proper cache control for questions`);
    } else {
      console.log(`❌ WARNING: Expected no-cache directive`);
    }

    if (correlationId) {
      console.log(`✅ SUCCESS: Correlation ID present for request tracking`);
    } else {
      console.log(`❌ WARNING: No correlation ID in response`);
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  console.log("🏁 Tests completed!");
}

testGetQuestion().catch(console.error);

export {};
