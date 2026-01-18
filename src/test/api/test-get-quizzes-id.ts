/* eslint-disable no-console */
/**
 * Manual test script for GET /api/quizzes/:id endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:get:quizzes:id
 *
 * Note: You need to have at least one quiz in your database to test this.
 * You can get a quiz ID by first running: npm run test:get:quizzes
 */

const BASE_URL = "http://localhost:3000";

interface AnswerDTO {
  id: string;
  answer_text: string;
  is_correct: boolean;
  source: string;
}

interface QuestionDetailDTO {
  id: string;
  question_text: string;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  answers: AnswerDTO[];
}

interface QuizDetailDTO {
  id: string;
  title: string;
  status: string;
  source_url: string | null;
  quizlet_set_id: string | null;
  created_at: string;
  updated_at: string;
  questions: QuestionDetailDTO[];
}

async function testGetQuizById() {
  console.log("🧪 Testing GET /api/quizzes/:id endpoint\n");

  // First, get all quizzes to find a valid ID
  console.log("Step 0: Fetching quizzes to get a valid ID...");
  let validQuizId: string | null = null;
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes`);
    const quizzes = await response.json();

    if (Array.isArray(quizzes) && quizzes.length > 0) {
      validQuizId = quizzes[0].id;
      console.log(`✅ Found quiz ID: ${validQuizId}\n`);
    } else {
      console.log("❌ No quizzes found in database. Please create a quiz first.");
      console.log("   Run: npm run test:post:quizzes:generate\n");
      return;
    }
  } catch (error) {
    console.log("❌ ERROR fetching quizzes:", error);
    console.log("   Make sure the server is running on", BASE_URL, "\n");
    return;
  }

  // Test 1: Get valid quiz by ID
  console.log(`Test 1: GET /api/quizzes/${validQuizId}`);
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${validQuizId}`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const quiz = data as QuizDetailDTO;
      console.log(`✅ SUCCESS: Got quiz "${quiz.title}"`);
      console.log(`   Status: ${quiz.status}`);
      console.log(`   Questions: ${quiz.questions.length}`);
      console.log(`   Created: ${new Date(quiz.created_at).toLocaleDateString()}`);

      // Verify structure
      if (quiz.questions.length > 0) {
        const firstQuestion = quiz.questions[0];
        console.log(`   First question: "${firstQuestion.question_text.substring(0, 50)}..."`);
        console.log(`   Answers: ${firstQuestion.answers.length}`);

        const correctAnswers = firstQuestion.answers.filter((a) => a.is_correct);
        const incorrectAnswers = firstQuestion.answers.filter((a) => !a.is_correct);
        console.log(`     - Correct: ${correctAnswers.length}`);
        console.log(`     - Incorrect: ${incorrectAnswers.length}`);
      }

      // Check caching headers
      const cacheControl = response.headers.get("Cache-Control");
      const etag = response.headers.get("ETag");
      const correlationId = response.headers.get("X-Correlation-ID");

      console.log(`   Cache-Control: ${cacheControl || "not set"}`);
      console.log(`   ETag: ${etag || "not set"}`);
      console.log(`   X-Correlation-ID: ${correlationId || "not set"}`);
    } else {
      console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 2: Invalid UUID format
  console.log("Test 2: GET /api/quizzes/invalid-uuid (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/invalid-uuid`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error`);
      console.log(`   Error code: ${data.error.code}`);
      console.log(`   Message: ${data.error.message}`);
    } else {
      console.log(`❌ FAILED: Expected 400 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 3: Non-existent quiz ID (valid UUID format but doesn't exist)
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  console.log(`Test 3: GET /api/quizzes/${nonExistentId} (should return 404)`);
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${nonExistentId}`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 404) {
      console.log(`✅ SUCCESS: Got expected 404 error`);
      console.log(`   Error code: ${data.error.code}`);
      console.log(`   Message: ${data.error.message}`);
    } else if (response.status === 200) {
      console.log(`⚠️  WARNING: Got 200 OK - quiz with ID ${nonExistentId} exists!`);
    } else {
      console.log(`❌ FAILED: Expected 404 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 4: Missing ID parameter
  console.log("Test 4: GET /api/quizzes/ (missing ID, should be routed to intex endpoint)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/`);
    const data = await response.text(); // May not be JSON

    console.log(`Status: ${response.status}`);
    console.log(`   This should be handled by Astro routing (return index endpoint)`);

    if (response.status === 200) {
      try {
        const jsonData = JSON.parse(data);
        if (Array.isArray(jsonData)) {
          console.log(`✅ Correctly routed to list endpoint (GET /api/quizzes)`);
          console.log(`   Got ${jsonData.length} quizzes`);
        }
      } catch {
        console.log(`❌ ERROR: got non-JSON response`);
      }
    } else if (response.status === 404) {
      console.log(`❌ ERROR: got 404 response`);
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  console.log("🏁 Tests completed!");
}

testGetQuizById().catch(console.error);

export {};
