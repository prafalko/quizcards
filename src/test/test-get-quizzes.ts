/* eslint-disable no-console */
/**
 * Manual test script for GET /api/quizzes endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:get:quizzes
 */

const BASE_URL = "http://localhost:3000";

interface QuizListItem {
  id: string;
  title: string;
  status: string;
  source_url: string | null;
  quizlet_set_id: string | null;
  question_count: number;
  created_at: string;
  updated_at: string;
}

async function testGetQuizzes() {
  console.log("🧪 Testing GET /api/quizzes endpoint\n");

  // Test 1: Get all quizzes (no filter)
  console.log("Test 1: GET /api/quizzes (no filter)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.ok && Array.isArray(data)) {
      console.log(`✅ SUCCESS: Got ${data.length} quizzes`);

      // Verify structure
      if (data.length > 0) {
        const quiz = data[0] as QuizListItem;
        console.log(`   First quiz: "${quiz.title}" (${quiz.question_count} questions)`);
      }
    } else {
      console.log(`❌ FAILED: Expected 200 with array`);
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 2: Filter by status=draft
  console.log("Test 2: GET /api/quizzes?status=draft");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes?status=draft`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok && Array.isArray(data)) {
      const allDraft = data.every((q: QuizListItem) => q.status === "draft");
      console.log(`✅ SUCCESS: Got ${data.length} draft quizzes`);
      console.log(`   All status=draft: ${allDraft ? "YES" : "NO"}`);
    } else {
      console.log(`❌ FAILED: Expected 200 with array`);
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 3: Filter by status=published
  console.log("Test 3: GET /api/quizzes?status=published");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes?status=published`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok && Array.isArray(data)) {
      const allPublished = data.every((q: QuizListItem) => q.status === "published");
      console.log(`✅ SUCCESS: Got ${data.length} published quizzes`);
      console.log(`   All status=published: ${allPublished ? "YES" : "NO"}`);
    } else {
      console.log(`❌ FAILED: Expected 200 with array`);
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 4: Invalid status parameter
  console.log("Test 4: GET /api/quizzes?status=invalid (should fail)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes?status=invalid`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error`);
    } else {
      console.log(`❌ FAILED: Expected 400 status`);
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  console.log("🏁 Tests completed!");
}

testGetQuizzes().catch(console.error);

export {};
