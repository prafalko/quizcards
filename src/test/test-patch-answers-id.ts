/* eslint-disable no-console */
/**
 * Manual test script for PATCH /api/answers/:id endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:patch:answers:id
 *
 * Note: You need to have at least one quiz with questions and answers in your database.
 * You can generate a quiz by running: npm run test:post:quizzes:generate
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
  questions: {
    id: string;
    question_text: string;
  }[];
}

async function testPatchAnswer() {
  console.log("🧪 Testing PATCH /api/answers/:id endpoint\n");

  // Step 0: Get a valid answer ID from an existing quiz
  console.log("Step 0: Fetching a quiz with questions and answers to get a valid answer ID...");
  let validAnswerId: string | null = null;
  let originalAnswerText: string | null = null;
  let originalAnswerSource: string | null = null;

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

    // Get the first question and fetch its details to get answers
    const firstQuestionId = quizWithQuestions.questions[0].id;
    const questionResponse = await fetch(`${BASE_URL}/api/questions/${firstQuestionId}`);
    const questionData = (await questionResponse.json()) as QuestionDetailDTO;

    if (!questionResponse.ok || !questionData.answers || questionData.answers.length === 0) {
      console.log("❌ No answers found for the question. Please ensure you have a quiz with answers.");
      console.log("   Run: npm run test:post:quizzes:generate\n");
      return;
    }

    // Get the first incorrect answer (to avoid modifying the correct answer)
    const incorrectAnswer = questionData.answers.find((answer) => !answer.is_correct);
    if (!incorrectAnswer) {
      console.log("❌ No incorrect answers found. All answers are marked as correct.");
      console.log("   This might indicate test data issues.\n");
      return;
    }

    validAnswerId = incorrectAnswer.id;
    originalAnswerText = incorrectAnswer.answer_text;
    originalAnswerSource = incorrectAnswer.source;

    console.log(`✅ Found answer ID: ${validAnswerId}`);
    console.log(`   From quiz: "${quizWithQuestions.title}"`);
    console.log(`   From question: "${questionData.question_text}"`);
    console.log(`   Original answer text: "${originalAnswerText}"`);
    console.log(`   Original answer source: "${originalAnswerSource}"\n`);
  } catch (error) {
    console.log("❌ ERROR fetching quiz/answer data:", error);
    console.log("   Make sure the server is running on", BASE_URL, "\n");
    return;
  }

  // Test 1: Successful answer update
  console.log(`Test 1: PATCH /api/answers/${validAnswerId} (successful update)`);
  const newAnswerText = `Updated Answer Text - ${Date.now()}`;
  try {
    const response = await fetch(`${BASE_URL}/api/answers/${validAnswerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer_text: newAnswerText,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const answer = data as AnswerDTO;
      console.log(`✅ SUCCESS: Answer updated`);
      console.log(`   New answer text: "${answer.answer_text}"`);
      console.log(`   Is correct: ${answer.is_correct}`);
      console.log(`   Source: ${answer.source}`);

      // Verify answer text was actually changed
      if (answer.answer_text === newAnswerText) {
        console.log(`   ✓ Answer text correctly updated`);
      } else {
        console.log(`   ❌ Answer text not updated correctly`);
      }

      // Verify source changed from 'ai' to 'ai-edited' if it was originally 'ai'
      if (originalAnswerSource === "ai" && answer.source === "ai-edited") {
        console.log(`   ✓ Source correctly changed from 'ai' to 'ai-edited'`);
      } else if (originalAnswerSource === "ai" && answer.source !== "ai-edited") {
        console.log(`   ❌ Source should have changed from 'ai' to 'ai-edited'`);
      } else if (originalAnswerSource !== "ai") {
        console.log(`   ✓ Source unchanged (was not 'ai')`);
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
  console.log("Test 2: PATCH /api/answers/invalid-uuid (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/answers/invalid-uuid`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer_text: "Test Answer",
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

  // Test 3: Update non-existent answer
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  console.log(`Test 3: PATCH /api/answers/${nonExistentId} (should return 404)`);
  try {
    const response = await fetch(`${BASE_URL}/api/answers/${nonExistentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer_text: "Test Answer",
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 404) {
      console.log(`✅ SUCCESS: Got expected 404 error`);
      console.log(`   Error code: ${data.error.code}`);
      console.log(`   Message: ${data.error.message}`);
    } else if (response.status === 200) {
      console.log(`⚠️  WARNING: Got 200 OK - answer with ID ${nonExistentId} exists!`);
    } else {
      console.log(`❌ FAILED: Expected 404 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 4: Update with empty answer text
  console.log(`Test 4: PATCH /api/answers/${validAnswerId} with empty text (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/answers/${validAnswerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer_text: "",
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for empty answer text`);
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

  // Test 5: Update with too long answer text
  console.log(`Test 5: PATCH /api/answers/${validAnswerId} with too long text (should return 400)`);
  const tooLongText = "A".repeat(513); // 513 characters, exceeds max of 512
  try {
    const response = await fetch(`${BASE_URL}/api/answers/${validAnswerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer_text: tooLongText,
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

  // Test 6: Update without answer_text field
  console.log(`Test 6: PATCH /api/answers/${validAnswerId} without answer_text field (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/answers/${validAnswerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for missing answer_text`);
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
  console.log(`Test 7: PATCH /api/answers/${validAnswerId} with invalid JSON (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/answers/${validAnswerId}`, {
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

  // Test 8: Update with answer text that has leading/trailing whitespace (should be trimmed)
  console.log(`Test 8: PATCH /api/answers/${validAnswerId} with whitespace (should be trimmed)`);
  const textWithWhitespace = "  Answer With Spaces  ";
  try {
    const response = await fetch(`${BASE_URL}/api/answers/${validAnswerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer_text: textWithWhitespace,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const answer = data as AnswerDTO;
      const expectedText = textWithWhitespace.trim();
      console.log(`✅ SUCCESS: Answer updated`);
      console.log(`   Sent text: "${textWithWhitespace}"`);
      console.log(`   Received text: "${answer.answer_text}"`);

      if (answer.answer_text === expectedText) {
        console.log(`   ✓ Answer text correctly trimmed`);
      } else {
        console.log(`   ❌ Answer text not trimmed correctly`);
      }
    } else {
      console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 9: Test AI source change behavior (if answer was originally 'ai')
  if (originalAnswerSource === "ai") {
    console.log(`Test 9: PATCH /api/answers/${validAnswerId} to verify AI source change behavior`);
    const aiTestText = `AI Source Test - ${Date.now()}`;
    try {
      const response = await fetch(`${BASE_URL}/api/answers/${validAnswerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer_text: aiTestText,
        }),
      });
      const data = await response.json();

      console.log(`Status: ${response.status}`);

      if (response.ok) {
        const answer = data as AnswerDTO;
        console.log(`✅ SUCCESS: Answer updated`);
        console.log(`   Source changed to: "${answer.source}"`);

        if (answer.source === "ai-edited") {
          console.log(`   ✓ Source correctly changed to 'ai-edited'`);
        } else {
          console.log(`   ❌ Source should have been 'ai-edited'`);
        }
      } else {
        console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
        console.log(`Response:`, JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log(`❌ ERROR:`, error);
    }
    console.log();
  }

  // Cleanup: Restore original answer text
  if (originalAnswerText && validAnswerId) {
    console.log("Cleanup: Restoring original answer text...");
    try {
      const response = await fetch(`${BASE_URL}/api/answers/${validAnswerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer_text: originalAnswerText,
        }),
      });

      if (response.ok) {
        console.log(`✅ Original answer text restored: "${originalAnswerText}"\n`);
      }
    } catch (error) {
      console.log(`⚠️  WARNING: Could not restore original answer text:`, error, "\n");
    }
  }

  console.log("🏁 Tests completed!");
}

testPatchAnswer().catch(console.error);

export {};
