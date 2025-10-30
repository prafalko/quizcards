/* eslint-disable no-console */
/**
 * Manual test script for PATCH /api/questions/:id endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:patch:question
 *
 * Note: You need to have at least one quiz with questions in your database.
 * You can generate a quiz by running: npm run test:post:quizzes:generate
 */

const BASE_URL = "http://localhost:3000";

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
    source: string;
  }[];
}

interface QuizDetailDTO {
  id: string;
  title: string;
  questions: {
    id: string;
    question_text: string;
  }[];
}

async function testPatchQuestion() {
  console.log("🧪 Testing PATCH /api/questions/:id endpoint\n");

  // Step 0: Get a valid question ID from an existing quiz
  console.log("Step 0: Fetching a quiz with questions to get a valid question ID...");
  let validQuestionId: string | null = null;
  let originalQuestionText: string | null = null;

  try {
    // First, get list of quizzes
    const quizzesResponse = await fetch(`${BASE_URL}/api/quizzes`);
    const quizzes = await quizzesResponse.json();

    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      console.log("❌ No quizzes found in database. Please create a quiz first.");
      console.log("   Run: npm run test:post:quizzes:generate\n");
      return;
    }

    // Get the first quiz with questions
    let quizWithQuestions: QuizDetailDTO | null = null;
    for (const quiz of quizzes) {
      const quizResponse = await fetch(`${BASE_URL}/api/quizzes/${quiz.id}`);
      const quizData = await quizResponse.json();

      if (quizResponse.ok && quizData.questions && quizData.questions.length > 0) {
        quizWithQuestions = quizData;
        break;
      }
    }

    if (!quizWithQuestions) {
      console.log("❌ No quizzes with questions found. Please generate a quiz with questions first.");
      console.log("   Run: npm run test:post:quizzes:generate\n");
      return;
    }

    validQuestionId = quizWithQuestions.questions[0].id;
    originalQuestionText = quizWithQuestions.questions[0].question_text;

    console.log(`✅ Found question ID: ${validQuestionId}`);
    console.log(`   From quiz: "${quizWithQuestions.title}"`);
    console.log(`   Original question text: "${originalQuestionText}"\n`);
  } catch (error) {
    console.log("❌ ERROR fetching quiz data:", error);
    console.log("   Make sure the server is running on", BASE_URL, "\n");
    return;
  }

  // Test 1: Successful question update
  console.log(`Test 1: PATCH /api/questions/${validQuestionId} (successful update)`);
  const newQuestionText = `Updated Question Text - ${Date.now()}`;
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_text: newQuestionText,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const question = data as QuestionDetailDTO;
      console.log(`✅ SUCCESS: Question updated`);
      console.log(`   New question text: "${question.question_text}"`);
      console.log(`   Answer count: ${question.answers.length}`);
      console.log(`   Updated at: ${new Date(question.updated_at).toLocaleString()}`);

      // Verify question text was actually changed
      if (question.question_text === newQuestionText) {
        console.log(`   ✓ Question text correctly updated`);
      } else {
        console.log(`   ❌ Question text not updated correctly`);
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
  console.log("Test 2: PATCH /api/questions/invalid-uuid (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/questions/invalid-uuid`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_text: "Test Question",
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

  // Test 3: Update non-existent question
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  console.log(`Test 3: PATCH /api/questions/${nonExistentId} (should return 404)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${nonExistentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_text: "Test Question",
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 404) {
      console.log(`✅ SUCCESS: Got expected 404 error`);
      console.log(`   Error code: ${data.error.code}`);
      console.log(`   Message: ${data.error.message}`);
    } else if (response.status === 200) {
      console.log(`⚠️  WARNING: Got 200 OK - question with ID ${nonExistentId} exists!`);
    } else {
      console.log(`❌ FAILED: Expected 404 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 4: Update with empty question text
  console.log(`Test 4: PATCH /api/questions/${validQuestionId} with empty text (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_text: "",
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for empty question text`);
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

  // Test 5: Update with too long question text
  console.log(`Test 5: PATCH /api/questions/${validQuestionId} with too long text (should return 400)`);
  const tooLongText = "A".repeat(2049); // 2049 characters, exceeds max of 2048
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_text: tooLongText,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for too long text`);
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

  // Test 6: Update without question_text field
  console.log(`Test 6: PATCH /api/questions/${validQuestionId} without question_text field (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for missing question_text`);
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
  console.log(`Test 7: PATCH /api/questions/${validQuestionId} with invalid JSON (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}`, {
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

  // Test 8: Update with question text that has leading/trailing whitespace (should be trimmed)
  console.log(`Test 8: PATCH /api/questions/${validQuestionId} with whitespace (should be trimmed)`);
  const textWithWhitespace = "  Question With Spaces?  ";
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_text: textWithWhitespace,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const question = data as QuestionDetailDTO;
      const expectedText = textWithWhitespace.trim();
      console.log(`✅ SUCCESS: Question updated`);
      console.log(`   Sent text: "${textWithWhitespace}"`);
      console.log(`   Received text: "${question.question_text}"`);

      if (question.question_text === expectedText) {
        console.log(`   ✓ Question text correctly trimmed`);
      } else {
        console.log(`   ❌ Question text not trimmed correctly`);
      }
    } else {
      console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Cleanup: Restore original question text
  if (originalQuestionText && validQuestionId) {
    console.log("Cleanup: Restoring original question text...");
    try {
      const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_text: originalQuestionText,
        }),
      });

      if (response.ok) {
        console.log(`✅ Original question text restored: "${originalQuestionText}"\n`);
      }
    } catch (error) {
      console.log(`⚠️  WARNING: Could not restore original question text:`, error, "\n");
    }
  }

  console.log("🏁 Tests completed!");
}

testPatchQuestion().catch(console.error);

export {};
