/* eslint-disable no-console */
/**
 * Manual test script for PATCH /api/quizzes/:id endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:patch:quizzes:id
 *
 * Note: You need to have at least one quiz in your database to test this.
 * You can get a quiz ID by first running: npm run test:get:quizzes
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

async function testPatchQuizById() {
  console.log("🧪 Testing PATCH /api/quizzes/:id endpoint\n");

  // First, get all quizzes to find a valid ID
  console.log("Step 0: Fetching quizzes to get a valid ID...");
  let validQuizId: string | null = null;
  let originalTitle: string | null = null;
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes`);
    const quizzes = await response.json();

    if (Array.isArray(quizzes) && quizzes.length > 0) {
      validQuizId = quizzes[0].id;
      originalTitle = quizzes[0].title;
      console.log(`✅ Found quiz ID: ${validQuizId}`);
      console.log(`   Original title: "${originalTitle}"\n`);
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

  // Test 1: Successful quiz update
  console.log(`Test 1: PATCH /api/quizzes/${validQuizId} (successful update)`);
  const newTitle = `Updated Quiz Title - ${Date.now()}`;
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${validQuizId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: newTitle,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const quiz = data as QuizSummaryDTO;
      console.log(`✅ SUCCESS: Quiz updated`);
      console.log(`   New title: "${quiz.title}"`);
      console.log(`   Question count: ${quiz.question_count}`);
      console.log(`   Status: ${quiz.status}`);
      console.log(`   Updated at: ${new Date(quiz.updated_at).toLocaleString()}`);

      // Verify title was actually changed
      if (quiz.title === newTitle) {
        console.log(`   ✓ Title correctly updated`);
      } else {
        console.log(`   ❌ Title not updated correctly`);
      }

      // Check correlation ID header
      const correlationId = response.headers.get("X-Correlation-ID");
      console.log(`   X-Correlation-ID: ${correlationId || "not set"}`);
    } else {
      console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 2: Update with invalid UUID format
  console.log("Test 2: PATCH /api/quizzes/invalid-uuid (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/invalid-uuid`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Test Title",
      }),
    });
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

  // Test 3: Update non-existent quiz
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  console.log(`Test 3: PATCH /api/quizzes/${nonExistentId} (should return 404)`);
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${nonExistentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Test Title",
      }),
    });
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

  // Test 4: Update with empty title
  console.log(`Test 4: PATCH /api/quizzes/${validQuizId} with empty title (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${validQuizId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "",
      }),
    });
    const data = await response.json();

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

  // Test 5: Update with too long title
  console.log(`Test 5: PATCH /api/quizzes/${validQuizId} with too long title (should return 400)`);
  const tooLongTitle = "A".repeat(256); // 256 characters, exceeds max of 255
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${validQuizId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: tooLongTitle,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for too long title`);
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

  // Test 6: Update without title field
  console.log(`Test 6: PATCH /api/quizzes/${validQuizId} without title field (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${validQuizId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for missing title`);
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

  // Test 7: Update with invalid JSON
  console.log(`Test 7: PATCH /api/quizzes/${validQuizId} with invalid JSON (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${validQuizId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: "invalid-json",
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for invalid JSON`);
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

  // Test 8: Update with title that has leading/trailing whitespace (should be trimmed)
  console.log(`Test 8: PATCH /api/quizzes/${validQuizId} with whitespace in title (should be trimmed)`);
  const titleWithWhitespace = "  Quiz Title With Spaces  ";
  try {
    const response = await fetch(`${BASE_URL}/api/quizzes/${validQuizId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: titleWithWhitespace,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const quiz = data as QuizSummaryDTO;
      const expectedTitle = titleWithWhitespace.trim();
      console.log(`✅ SUCCESS: Quiz updated`);
      console.log(`   Sent title: "${titleWithWhitespace}"`);
      console.log(`   Received title: "${quiz.title}"`);

      if (quiz.title === expectedTitle) {
        console.log(`   ✓ Title correctly trimmed`);
      } else {
        console.log(`   ❌ Title not trimmed correctly`);
      }
    } else {
      console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Restore original title
  if (originalTitle && validQuizId) {
    console.log("Cleanup: Restoring original title...");
    try {
      const response = await fetch(`${BASE_URL}/api/quizzes/${validQuizId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: originalTitle,
        }),
      });

      if (response.ok) {
        console.log(`✅ Original title restored: "${originalTitle}"\n`);
      }
    } catch (error) {
      console.log(`⚠️  WARNING: Could not restore original title:`, error, "\n");
    }
  }

  console.log("🏁 Tests completed!");
}

testPatchQuizById().catch(console.error);

export {};
