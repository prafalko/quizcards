/* eslint-disable no-console */
/**
 * Manual test script for POST /api/quizzes/generate endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:post:quizzes:generate
 *
 * Note: This endpoint uses MOCK services (Quizlet and AI), so it will work
 * with any valid Quizlet URL format. The actual quiz generation happens
 * with mock data.
 */

const BASE_URL = "http://localhost:3000";

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

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

async function testGenerateQuiz() {
  console.log("🧪 Testing POST /api/quizzes/generate endpoint\n");

  // Test 1: Generate quiz with valid Quizlet URL (using mock service)
  console.log("Test 1: POST /api/quizzes/generate with valid URL");
  const validQuizletUrl = "https://quizlet.com/123456789/biology-cells-flash-cards/";
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: validQuizletUrl,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 201) {
      const quiz = data as QuizSummaryDTO;
      console.log(`✅ SUCCESS: Quiz created!`);
      console.log(`   ID: ${quiz.id}`);
      console.log(`   Title: ${quiz.title}`);
      console.log(`   Status: ${quiz.status}`);
      console.log(`   Questions: ${quiz.question_count}`);
      console.log(`   Quizlet Set ID: ${quiz.quizlet_set_id}`);
      console.log(`   Created: ${new Date(quiz.created_at).toLocaleString()}`);
    } else {
      console.log(`❌ FAILED: Expected 201 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 2: Generate quiz with custom title
  console.log("Test 2: POST /api/quizzes/generate with custom title");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: "https://quizlet.com/987654321/chemistry-elements-flash-cards/",
        title: "My Custom Chemistry Quiz",
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 201) {
      const quiz = data as QuizSummaryDTO;
      console.log(`✅ SUCCESS: Quiz created with custom title!`);
      console.log(`   Title: ${quiz.title}`);

      if (quiz.title === "My Custom Chemistry Quiz") {
        console.log(`   ✓ Custom title was applied correctly`);
      } else {
        console.log(`   ⚠️  WARNING: Custom title not applied (got: "${quiz.title}")`);
      }
    } else {
      console.log(`❌ FAILED: Expected 201 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 3: Invalid URL format
  console.log("Test 3: POST with invalid URL format (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: "not-a-valid-url",
      }),
    });
    const data = (await response.json()) as ErrorResponse;

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

  // Test 4: Non-Quizlet URL
  console.log("Test 4: POST with non-Quizlet URL (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: "https://google.com/some-page",
      }),
    });
    const data = (await response.json()) as ErrorResponse;

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error`);
      console.log(`   Error code: ${data.error.code}`);
      console.log(`   Message: ${data.error.message}`);

      if (data.error.message.includes("quizlet")) {
        console.log(`   ✓ Error message mentions Quizlet`);
      }
    } else {
      console.log(`❌ FAILED: Expected 400 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 5: Missing source_url
  console.log("Test 5: POST without source_url (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Quiz without URL",
      }),
    });
    const data = (await response.json()) as ErrorResponse;

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

  // Test 6: Empty title (should be rejected)
  console.log("Test 6: POST with empty title (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: "https://quizlet.com/123456789/test-flash-cards/",
        title: "",
      }),
    });
    const data = (await response.json()) as ErrorResponse;

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for empty title`);
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

  // Test 7: Title too long (> 200 characters)
  console.log("Test 7: POST with title > 200 characters (should return 400)");
  const longTitle = "A".repeat(201);
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: "https://quizlet.com/123456789/test-flash-cards/",
        title: longTitle,
      }),
    });
    const data = (await response.json()) as ErrorResponse;

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for long title`);
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

  // Test 8: Invalid JSON body
  console.log("Test 8: POST with invalid JSON (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{ invalid json }",
    });
    const data = (await response.json()) as ErrorResponse;

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for invalid JSON`);
      console.log(`   Error code: ${data.error.code}`);
    } else {
      console.log(`❌ FAILED: Expected 400 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 9: Invalid Quizlet URL format (valid URL but wrong pattern)
  console.log("Test 9: POST with invalid Quizlet URL pattern (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: "https://quizlet.com/invalid-format",
      }),
    });
    const data = (await response.json()) as ErrorResponse;

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

  console.log("🏁 Tests completed!");
  console.log("\n📝 Note: This endpoint uses MOCK services in development.");
  console.log("   Real Quizlet integration and AI will be tested in production/staging.");
}

testGenerateQuiz().catch(console.error);

export {};
