import type { APIRoute } from "astro";
import { ZodError } from "zod";

import type { CreateQuizCommand, ErrorResponse, QuizSummaryDTO } from "../../../types";
import { validateRequestData } from "../../../lib/validators/quiz.validator";
import { extractQuizletSetId, fetchQuizletSet } from "../../../lib/services/quizlet.service";
import { generateIncorrectAnswers } from "../../../lib/services/ai.service";
import { supabaseClient } from "../../../db/supabase.client";
import { supabaseDefaultUserId } from "../../../db/supabase.client";

export const prerender = false;

/**
 * POST /api/quizzes/generate
 *
 * Generates a quiz from a Quizlet set URL by:
 * 1. Validating the input
 * 2. Fetching flashcards from Quizlet
 * 3. Generating incorrect answers using AI
 * 4. Saving the quiz to the database
 *
 * @returns 201 Created with QuizSummaryDTO on success
 * @returns 400 Bad Request for validation errors
 * @returns 403 Forbidden for private Quizlet sets
 * @returns 404 Not Found for non-existent Quizlet sets
 * @returns 422 Unprocessable Entity for empty Quizlet sets
 * @returns 500 Internal Server Error for AI or database failures
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Step 1: Parse and validate request body
    let source_url: string;
    let custom_title: string | undefined;
    try {
      const body = await request.json();
      const validated = validateRequestData.parse(body) as CreateQuizCommand;
      source_url = validated.source_url;
      custom_title = validated.title;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorResponse: ErrorResponse = {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: { errors: error.errors },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const errorResponse: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Failed to parse request data",
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Extract Quizlet set ID
    let quizletSetId: string;
    try {
      quizletSetId = extractQuizletSetId(source_url);
    } catch {
      const errorResponse: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid Quizlet URL format",
          details: { source_url },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Fetch flashcards from Quizlet (MOCK)
    let quizletSet;
    try {
      quizletSet = await fetchQuizletSet(quizletSetId);
    } catch (error) {
      const quizletError = error as ErrorResponse;

      // Add quizlet set ID to error details
      quizletError.error.details = { quizlet_set_id: quizletSetId };

      // Determine HTTP status based on error code
      let status = 500;
      if (quizletError.error.code === "QUIZLET_NOT_FOUND") status = 404;
      if (quizletError.error.code === "QUIZLET_PRIVATE") status = 403;
      if (quizletError.error.code === "QUIZLET_EMPTY") status = 422;

      return new Response(JSON.stringify(quizletError), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Generate incorrect answers using AI (MOCK)
    const questionsWithAnswers = await Promise.all(
      quizletSet.flashcards.map(async (flashcard) => {
        const aiResponse = await generateIncorrectAnswers({
          question: flashcard.term,
          correctAnswer: flashcard.definition,
        });

        return {
          question_text: flashcard.term,
          answers: [
            { answer_text: flashcard.definition, is_correct: true },
            { answer_text: aiResponse.incorrectAnswers[0], is_correct: false },
            { answer_text: aiResponse.incorrectAnswers[1], is_correct: false },
            { answer_text: aiResponse.incorrectAnswers[2], is_correct: false },
          ],
          metadata: aiResponse.metadata,
        };
      })
    );

    // Step 5: Save quiz to database
    // Use service role client to bypass RLS for development
    const supabase = supabaseClient;
    const userId = supabaseDefaultUserId; // MOCK: Development user ID

    // Use the custom title if provided, otherwise use Quizlet set title
    const quizTitle = custom_title || quizletSet.title;

    // Insert quiz
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: quizTitle,
        status: "draft",
        source_url,
        quizlet_set_id: quizletSetId,
        user_id: userId,
      })
      .select()
      .single();

    if (quizError || !quiz) {
      // TODO: Add proper logging service
      const errorResponse: ErrorResponse = {
        error: {
          code: "AI_GENERATION_FAILED",
          message: "Failed to save quiz to database",
          details: { error: quizError?.message },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert questions with answers
    for (const questionData of questionsWithAnswers) {
      const { data: question, error: questionError } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quiz.id,
          question_text: questionData.question_text,
          metadata: questionData.metadata as unknown as Record<string, string | number | undefined>,
        })
        .select()
        .single();

      if (questionError || !question) {
        // TODO: Add proper logging service
        // Rollback: delete the quiz
        await supabase.from("quizzes").delete().eq("id", quiz.id);

        const errorResponse: ErrorResponse = {
          error: {
            code: "AI_GENERATION_FAILED",
            message: "Failed to save questions to database",
            details: { error: questionError?.message },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Insert answers for this question
      const answersToInsert = questionData.answers.map((answer) => ({
        question_id: question.id,
        answer_text: answer.answer_text,
        is_correct: answer.is_correct,
      }));

      const { error: answersError } = await supabase.from("answers").insert(answersToInsert);

      if (answersError) {
        // TODO: Add proper logging service
        // Rollback: delete the quiz (will cascade to questions)
        await supabase.from("quizzes").delete().eq("id", quiz.id);

        const errorResponse: ErrorResponse = {
          error: {
            code: "AI_GENERATION_FAILED",
            message: "Failed to save answers to database",
            details: { error: answersError?.message },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Step 6: Build and return response
    const response: QuizSummaryDTO = {
      id: quiz.id,
      title: quiz.title,
      status: quiz.status,
      source_url: quiz.source_url,
      quizlet_set_id: quiz.quizlet_set_id,
      question_count: questionsWithAnswers.length,
      created_at: quiz.created_at,
      updated_at: quiz.updated_at,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: { errors: error.errors },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    // TODO: Add proper logging service
    const errorResponse: ErrorResponse = {
      error: {
        code: "AI_GENERATION_FAILED",
        message: "An unexpected error occurred",
        details: { error: error instanceof Error ? error.message : String(error) },
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
