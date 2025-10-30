/* eslint-disable no-console */
/**
 * Manual test script for POST /api/questions/:id/regenerate endpoint
 *
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: npm run test:regenerate:answers
 *
 * Note: You need to have at least one quiz with questions in your database.
 * You can generate a quiz by running: npm run test:post:quizzes:generate
 */

const BASE_URL = "http://localhost:3000";

interface QuestionDetailDTO {
  id: string;
  question_text: string;
  metadata: {
    model?: string;
    temperature?: number;
    seed?: number;
    prompt?: string;
    regenerated_at?: string;
  } | null;
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

async function testRegenerateAnswers() {
  console.log("🧪 Testing POST /api/questions/:id/regenerate endpoint\n");

  // Step 0: Get a valid question ID from an existing quiz
  console.log("Step 0: Fetching a quiz with questions to get a valid question ID...");
  let validQuestionId: string | null = null;
  let originalAnswers: QuestionDetailDTO["answers"] = [];

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

    // Fetch the complete question details to get original answers
    const questionResponse = await fetch(`${BASE_URL}/api/questions/${validQuestionId}`);
    const questionData = (await questionResponse.json()) as QuestionDetailDTO;
    originalAnswers = questionData.answers;

    console.log(`✅ Found question ID: ${validQuestionId}`);
    console.log(`   From quiz: "${quizWithQuestions.title}"`);
    console.log(`   Question: "${questionData.question_text}"`);
    console.log(`   Current answer count: ${originalAnswers.length}`);
    console.log(
      `   Current incorrect answers: ${originalAnswers
        .filter((a) => !a.is_correct)
        .map((a) => a.answer_text)
        .join(", ")}\n`
    );
  } catch (error) {
    console.log("❌ ERROR fetching quiz data:", error);
    console.log("   Make sure the server is running on", BASE_URL, "\n");
    return;
  }

  // Test 1: Successful answer regeneration (no parameters - uses defaults)
  console.log(`Test 1: POST /api/questions/${validQuestionId}/regenerate (default parameters)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const question = data as QuestionDetailDTO;
      console.log(`✅ SUCCESS: Answers regenerated`);
      console.log(`   Question text (unchanged): "${question.question_text}"`);
      console.log(`   Answer count: ${question.answers.length}`);

      const correctAnswers = question.answers.filter((a) => a.is_correct);
      const incorrectAnswers = question.answers.filter((a) => !a.is_correct);

      console.log(`   Correct answers: ${correctAnswers.length}`);
      console.log(`   Incorrect answers: ${incorrectAnswers.length}`);
      console.log(`   New incorrect answers: ${incorrectAnswers.map((a) => a.answer_text).join(", ")}`);

      // Verify AI source
      const allAiSource = incorrectAnswers.every((a) => a.source === "ai");
      console.log(`   ✓ All incorrect answers have source='ai': ${allAiSource ? "YES" : "NO"}`);

      // Check metadata
      if (question.metadata) {
        console.log(`   Metadata model: ${question.metadata.model}`);
        console.log(`   Metadata temperature: ${question.metadata.temperature}`);
        console.log(`   Metadata regenerated_at: ${question.metadata.regenerated_at ? "SET" : "NOT SET"}`);
      }

      // Check correlation ID header
      const correlationId = response.headers.get("X-Correlation-ID");
      console.log(`   X-Correlation-ID: ${correlationId || "not set"}`);

      // Check updated_at changed
      console.log(`   Updated at: ${new Date(question.updated_at).toLocaleString()}`);
    } else {
      console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 2: Regenerate with custom temperature
  console.log(`Test 2: POST /api/questions/${validQuestionId}/regenerate (temperature=0.9)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        temperature: 0.9,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const question = data as QuestionDetailDTO;
      console.log(`✅ SUCCESS: Answers regenerated with custom temperature`);
      console.log(`   Metadata temperature: ${question.metadata?.temperature}`);

      if (question.metadata?.temperature === 0.9) {
        console.log(`   ✓ Temperature correctly set to 0.9`);
      } else {
        console.log(`   ❌ Temperature not set correctly`);
      }
    } else {
      console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 3: Regenerate with seed for reproducibility
  console.log(`Test 3: POST /api/questions/${validQuestionId}/regenerate (seed=12345)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seed: 12345,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const question = data as QuestionDetailDTO;
      console.log(`✅ SUCCESS: Answers regenerated with seed`);
      console.log(`   Metadata seed: ${question.metadata?.seed}`);

      if (question.metadata?.seed === 12345) {
        console.log(`   ✓ Seed correctly set to 12345`);
      } else {
        console.log(`   ❌ Seed not set correctly`);
      }
    } else {
      console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  // Test 4: Regenerate with invalid UUID format
  console.log("Test 4: POST /api/questions/invalid-uuid/regenerate (should return 400)");
  try {
    const response = await fetch(`${BASE_URL}/api/questions/invalid-uuid/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
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

  // Test 5: Regenerate for non-existent question
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  console.log(`Test 5: POST /api/questions/${nonExistentId}/regenerate (should return 404)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${nonExistentId}/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
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

  // Test 6: Regenerate with invalid temperature (> 1)
  console.log(`Test 6: POST /api/questions/${validQuestionId}/regenerate with temperature > 1 (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        temperature: 1.5,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for invalid temperature`);
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

  // Test 7: Regenerate with invalid temperature (< 0)
  console.log(`Test 7: POST /api/questions/${validQuestionId}/regenerate with temperature < 0 (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        temperature: -0.5,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for invalid temperature`);
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

  // Test 8: Regenerate with non-integer seed
  console.log(`Test 8: POST /api/questions/${validQuestionId}/regenerate with non-integer seed (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seed: 123.45,
      }),
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.status === 400) {
      console.log(`✅ SUCCESS: Got expected 400 error for non-integer seed`);
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

  // Test 9: Regenerate with invalid JSON
  console.log(`Test 9: POST /api/questions/${validQuestionId}/regenerate with invalid JSON (should return 400)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}/regenerate`, {
      method: "POST",
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

  // Test 10: Regenerate with empty body (should use defaults)
  console.log(`Test 10: POST /api/questions/${validQuestionId}/regenerate with empty body (should use defaults)`);
  try {
    const response = await fetch(`${BASE_URL}/api/questions/${validQuestionId}/regenerate`, {
      method: "POST",
    });
    const data = await response.json();

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const question = data as QuestionDetailDTO;
      console.log(`✅ SUCCESS: Answers regenerated with defaults`);
      console.log(`   Metadata temperature: ${question.metadata?.temperature || "default (0.7)"}`);
    } else {
      console.log(`❌ FAILED: Expected 200 but got ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`❌ ERROR:`, error);
  }
  console.log();

  console.log("🏁 Tests completed!");
}

testRegenerateAnswers().catch(console.error);

export {};
