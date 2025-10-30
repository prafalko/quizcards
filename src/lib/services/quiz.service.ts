import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuizDetailDTO, QuestionDetailDTO, AnswerDTO, QuizzesListDTO, QuizzesListQueryParams } from "../../types";
import { logger } from "./logger.service";
import { DatabaseError, NotFoundError } from "../../lib/errors";

/**
 * Service class for quiz-related database operations
 */
export class QuizService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Retrieves a complete quiz with all questions and answers by ID
   * Uses optimized single query with JOIN operations for better performance
   * @param quizId - The UUID of the quiz to retrieve
   * @param userId - The user ID for authorization
   * @param correlationId - Request correlation ID for tracking
   * @returns Promise<QuizDetailDTO> - Complete quiz data
   * @throws AppError for various error conditions
   */
  async getQuizById(quizId: string, userId: string, correlationId?: string): Promise<QuizDetailDTO> {
    const startTime = Date.now();
    logger.logRequestStart("getQuizById", correlationId || "unknown", userId, { quizId });

    try {
      // Step 1: Fetch quiz with all related questions and answers in a single optimized query
      const { data: quizData, error: queryError } = await this.supabase
        .from("quizzes")
        .select(
          `
          *,
          quiz_questions (
            *,
            answers (*)
          )
        `
        )
        .eq("id", quizId)
        .eq("user_id", userId)
        .single();

      if (queryError) {
        logger.logDatabaseOperation("select", "quizzes", correlationId || "unknown", false, queryError);

        if (queryError.code === "PGRST116") {
          // No rows returned - quiz not found or belongs to different user
          throw new NotFoundError("Quiz", quizId, correlationId);
        }

        // Other database errors
        throw new DatabaseError("getQuizById", queryError, correlationId);
      }

      if (!quizData) {
        throw new NotFoundError("Quiz", quizId, correlationId);
      }

      logger.logDatabaseOperation("select", "quizzes", correlationId || "unknown", true);

      // Step 2: Transform and validate data with proper type casting
      const questionsWithAnswers: QuestionDetailDTO[] = (quizData.quiz_questions || [])
        .map((question: unknown) => {
          // Type assertion for question data from Supabase
          const q = question as {
            id: string;
            question_text: string;
            metadata: unknown;
            created_at: string;
            updated_at: string;
            answers: unknown[];
          };

          // Validate and transform answers
          const questionAnswers: AnswerDTO[] = (q.answers || [])
            .sort((a, b) => {
              const aTime = new Date((a as { created_at: string }).created_at).getTime();
              const bTime = new Date((b as { created_at: string }).created_at).getTime();
              return aTime - bTime;
            })
            .map((answer) => {
              const ans = answer as { id: string; answer_text: string; is_correct: boolean; source: string };
              return {
                id: ans.id,
                answer_text: ans.answer_text,
                is_correct: Boolean(ans.is_correct),
                source: ans.source,
              };
            });

          // Validate metadata structure and type it properly
          let metadata: unknown = null;
          if (q.metadata) {
            try {
              // If metadata is already an object, use it; if it's a string, parse it
              metadata = typeof q.metadata === "string" ? JSON.parse(q.metadata) : q.metadata;
            } catch (parseError) {
              // If parsing fails, log the error and set to null
              logger.warn("Failed to parse question metadata", {
                correlationId,
                quizId,
                metadata: {
                  questionId: q.id,
                  error: parseError instanceof Error ? parseError.message : String(parseError),
                },
              });
              metadata = null;
            }
          }

          return {
            id: q.id,
            question_text: q.question_text,
            metadata,
            created_at: q.created_at,
            updated_at: q.updated_at,
            answers: questionAnswers,
          };
        })
        .sort(
          (a: QuestionDetailDTO, b: QuestionDetailDTO) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      // Step 3: Validate response size to prevent extremely large responses
      const totalAnswers = questionsWithAnswers.reduce((sum, q) => sum + q.answers.length, 0);
      const responseSizeEstimate = JSON.stringify(questionsWithAnswers).length;

      // Warn about potentially problematic response sizes (> 1MB)
      if (responseSizeEstimate > 1024 * 1024) {
        logger.warn("Large quiz response detected", {
          correlationId,
          quizId,
          metadata: {
            responseSizeBytes: responseSizeEstimate,
            questionCount: questionsWithAnswers.length,
            answerCount: totalAnswers,
          },
        });
      }

      // Step 4: Build and return the complete quiz DTO
      const quizDetail: QuizDetailDTO = {
        id: quizData.id,
        title: quizData.title,
        status: quizData.status,
        source_url: quizData.source_url,
        quizlet_set_id: quizData.quizlet_set_id,
        created_at: quizData.created_at,
        updated_at: quizData.updated_at,
        questions: questionsWithAnswers,
      };

      logger.logRequestComplete("getQuizById", correlationId || "unknown", Date.now() - startTime, userId, {
        quizId,
        questionCount: questionsWithAnswers.length,
        answerCount: totalAnswers,
      });

      return quizDetail;
    } catch (error) {
      // Log the error and re-throw
      logger.logRequestError("getQuizById", correlationId || "unknown", error, userId, { quizId });
      throw error;
    }
  }

  /**
   * Retrieves a list of quizzes for a user with optional status filtering
   * Results are sorted by creation date (newest first)
   * @param userId - The user ID for filtering quizzes
   * @param params - Query parameters for filtering (optional status)
   * @param correlationId - Request correlation ID for tracking
   * @returns Promise<QuizzesListDTO> - List of quizzes with question counts
   * @throws AppError for various error conditions
   */
  async getQuizzes(userId: string, params: QuizzesListQueryParams, correlationId?: string): Promise<QuizzesListDTO> {
    const startTime = Date.now();
    logger.logRequestStart("getQuizzes", correlationId || "unknown", userId, { params });

    try {
      // Build query with user_id filter and optional status filter
      // We select quiz_questions(id) to get an array of question IDs for counting
      let query = this.supabase
        .from("quizzes")
        .select(
          `
          *,
          quiz_questions (id)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Apply optional status filter
      if (params.status) {
        query = query.eq("status", params.status);
      }

      const { data: quizzes, error: queryError } = await query;

      if (queryError) {
        logger.logDatabaseOperation("select", "quizzes", correlationId || "unknown", false, queryError);
        throw new DatabaseError("getQuizzes", queryError, correlationId);
      }

      logger.logDatabaseOperation("select", "quizzes", correlationId || "unknown", true);

      // Transform data to QuizzesListDTO
      const quizzesList: QuizzesListDTO = (quizzes || []).map((quiz) => {
        // Count questions for each quiz by counting the array length
        const questionCount = Array.isArray(quiz.quiz_questions) ? quiz.quiz_questions.length : 0;

        return {
          id: quiz.id,
          title: quiz.title,
          status: quiz.status,
          source_url: quiz.source_url,
          quizlet_set_id: quiz.quizlet_set_id,
          question_count: questionCount,
          created_at: quiz.created_at,
          updated_at: quiz.updated_at,
        };
      });

      logger.logRequestComplete("getQuizzes", correlationId || "unknown", Date.now() - startTime, userId, {
        count: quizzesList.length,
        status: params.status || "all",
      });

      return quizzesList;
    } catch (error) {
      logger.logRequestError("getQuizzes", correlationId || "unknown", error, userId, { params });
      throw error;
    }
  }
}

/**
 * Factory function to create a QuizService instance
 * @param supabase - Supabase client instance
 * @returns QuizService instance
 */
export function createQuizService(supabase: SupabaseClient): QuizService {
  return new QuizService(supabase);
}
