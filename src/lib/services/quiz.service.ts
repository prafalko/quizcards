import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  QuizDetailDTO,
  QuestionDetailDTO,
  AnswerDTO,
  QuizzesListDTO,
  QuizzesListQueryParams,
  UpdateQuizCommand,
  UpdateQuestionCommand,
  UpdateAnswerCommand,
  QuizSummaryDTO,
  RegenerateAnswersCommand,
  QuestionMetadata,
} from "../../types";
import { logger } from "./logger.service";
import { DatabaseError, NotFoundError, ForbiddenError, AIGenerationError } from "../../lib/errors";
import { generateIncorrectAnswers } from "./ai.service";

/**
 * Timeout wrapper for promises
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Error message to throw on timeout
 * @returns Promise that rejects if timeout is exceeded
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

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

  /**
   * Updates a quiz's properties (currently only title can be updated)
   * @param quizId - The UUID of the quiz to update
   * @param userId - The user ID for authorization
   * @param data - Update data (currently only title)
   * @param correlationId - Request correlation ID for tracking
   * @returns Promise<QuizSummaryDTO> - Updated quiz data with question count
   * @throws NotFoundError if quiz doesn't exist or user doesn't have access
   * @throws DatabaseError for database operation errors
   */
  async updateQuiz(
    quizId: string,
    userId: string,
    data: UpdateQuizCommand,
    correlationId?: string
  ): Promise<QuizSummaryDTO> {
    const startTime = Date.now();
    logger.logRequestStart("updateQuiz", correlationId || "unknown", userId, { quizId, data });

    try {
      // Step 1: Update the quiz with new data
      // Important: We filter by both id AND user_id to prevent unauthorized access (IDOR protection)
      const { error: updateError } = await this.supabase
        .from("quizzes")
        .update({
          title: data.title,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quizId)
        .eq("user_id", userId);

      if (updateError) {
        logger.logDatabaseOperation("update", "quizzes", correlationId || "unknown", false, updateError);
        throw new DatabaseError("updateQuiz", updateError, correlationId);
      }

      logger.logDatabaseOperation("update", "quizzes", correlationId || "unknown", true);

      // Step 2: Fetch the updated quiz with question count
      const { data: quizData, error: selectError } = await this.supabase
        .from("quizzes")
        .select(
          `
          *,
          quiz_questions (id)
        `
        )
        .eq("id", quizId)
        .eq("user_id", userId)
        .single();

      if (selectError) {
        logger.logDatabaseOperation("select", "quizzes", correlationId || "unknown", false, selectError);

        if (selectError.code === "PGRST116") {
          // No rows returned - quiz not found or belongs to different user
          throw new NotFoundError("Quiz", quizId, correlationId);
        }

        throw new DatabaseError("updateQuiz", selectError, correlationId);
      }

      if (!quizData) {
        throw new NotFoundError("Quiz", quizId, correlationId);
      }

      logger.logDatabaseOperation("select", "quizzes", correlationId || "unknown", true);

      // Step 3: Transform to QuizSummaryDTO
      const questionCount = Array.isArray(quizData.quiz_questions) ? quizData.quiz_questions.length : 0;

      const quizSummary: QuizSummaryDTO = {
        id: quizData.id,
        title: quizData.title,
        status: quizData.status,
        source_url: quizData.source_url,
        quizlet_set_id: quizData.quizlet_set_id,
        question_count: questionCount,
        created_at: quizData.created_at,
        updated_at: quizData.updated_at,
      };

      logger.logRequestComplete("updateQuiz", correlationId || "unknown", Date.now() - startTime, userId, {
        quizId,
        title: data.title,
      });

      return quizSummary;
    } catch (error) {
      logger.logRequestError("updateQuiz", correlationId || "unknown", error, userId, { quizId, data });
      throw error;
    }
  }

  /**
   * Retrieves a question with all its answers by ID
   * Verifies that the question belongs to a quiz owned by the authenticated user
   * @param questionId - The UUID of the question to retrieve
   * @param userId - The user ID for authorization (IDOR protection)
   * @param correlationId - Request correlation ID for tracking
   * @returns Promise<QuestionDetailDTO> - Question data with all answers
   * @throws NotFoundError if question doesn't exist or user doesn't have access
   * @throws DatabaseError for database operation errors
   */
  async getQuestionById(questionId: string, userId: string, correlationId?: string): Promise<QuestionDetailDTO> {
    const startTime = Date.now();
    logger.logRequestStart("getQuestionById", correlationId || "unknown", userId, { questionId });

    try {
      // Step 1: Fetch question with answers and verify ownership
      // We join with quizzes table to ensure the question belongs to a quiz owned by the user
      const { data: questionData, error: queryError } = await this.supabase
        .from("quiz_questions")
        .select(
          `
          *,
          answers (*),
          quizzes!inner (
            user_id
          )
        `
        )
        .eq("id", questionId)
        .eq("quizzes.user_id", userId)
        .single();

      if (queryError) {
        logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", false, queryError);

        if (queryError.code === "PGRST116") {
          // No rows returned - question not found or doesn't belong to user's quiz
          throw new NotFoundError("Question", questionId, correlationId);
        }

        // Other database errors
        throw new DatabaseError("getQuestionById", queryError, correlationId);
      }

      if (!questionData) {
        throw new NotFoundError("Question", questionId, correlationId);
      }

      logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", true);

      // Step 2: Transform answers data
      const questionAnswers: AnswerDTO[] = (questionData.answers || [])
        .sort((a: unknown, b: unknown) => {
          const aTime = new Date((a as { created_at: string }).created_at).getTime();
          const bTime = new Date((b as { created_at: string }).created_at).getTime();
          return aTime - bTime;
        })
        .map((answer: unknown) => {
          const ans = answer as { id: string; answer_text: string; is_correct: boolean; source: string };
          return {
            id: ans.id,
            answer_text: ans.answer_text,
            is_correct: Boolean(ans.is_correct),
            source: ans.source,
          };
        });

      // Step 3: Parse and validate metadata
      let metadata: unknown = null;
      if (questionData.metadata) {
        try {
          // If metadata is already an object, use it; if it's a string, parse it
          metadata =
            typeof questionData.metadata === "string" ? JSON.parse(questionData.metadata) : questionData.metadata;
        } catch (parseError) {
          // If parsing fails, log the error and set to null
          logger.warn("Failed to parse question metadata", {
            correlationId,
            metadata: {
              questionId,
              error: parseError instanceof Error ? parseError.message : String(parseError),
            },
          });
          metadata = null;
        }
      }

      // Step 4: Build and return the QuestionDetailDTO
      const questionDetail: QuestionDetailDTO = {
        id: questionData.id,
        question_text: questionData.question_text,
        metadata: metadata as QuestionDetailDTO["metadata"],
        created_at: questionData.created_at,
        updated_at: questionData.updated_at,
        answers: questionAnswers,
      };

      logger.logRequestComplete("getQuestionById", correlationId || "unknown", Date.now() - startTime, userId, {
        questionId,
        answerCount: questionAnswers.length,
      });

      return questionDetail;
    } catch (error) {
      // Log the error and re-throw
      logger.logRequestError("getQuestionById", correlationId || "unknown", error, userId, { questionId });
      throw error;
    }
  }

  /**
   * Permanently deletes a quiz and all associated questions and answers
   * Uses CASCADE delete configured in database schema for automatic cleanup
   * @param quizId - The UUID of the quiz to delete
   * @param userId - The user ID for authorization (IDOR protection)
   * @param correlationId - Request correlation ID for tracking
   * @returns Promise<void> - No return value on success
   * @throws NotFoundError if quiz doesn't exist or user doesn't have access
   * @throws DatabaseError for database operation errors
   */
  async deleteQuiz(quizId: string, userId: string, correlationId?: string): Promise<void> {
    const startTime = Date.now();
    logger.logRequestStart("deleteQuiz", correlationId || "unknown", userId, { quizId });

    try {
      // Step 1: Delete the quiz with user_id check for IDOR protection
      // The database schema has ON DELETE CASCADE configured, so all related
      // quiz_questions and answers will be automatically deleted
      const { error: deleteError, count } = await this.supabase
        .from("quizzes")
        .delete({ count: "exact" })
        .eq("id", quizId)
        .eq("user_id", userId);

      if (deleteError) {
        logger.logDatabaseOperation("delete", "quizzes", correlationId || "unknown", false, deleteError);
        throw new DatabaseError("deleteQuiz", deleteError, correlationId);
      }

      // Step 2: Check if any row was deleted
      // If count is 0, the quiz either doesn't exist or belongs to a different user
      if (count === 0) {
        logger.logDatabaseOperation("delete", "quizzes", correlationId || "unknown", false, {
          message: "No rows deleted - quiz not found or access denied",
        });
        throw new NotFoundError("Quiz", quizId, correlationId);
      }

      logger.logDatabaseOperation("delete", "quizzes", correlationId || "unknown", true);

      logger.logRequestComplete("deleteQuiz", correlationId || "unknown", Date.now() - startTime, userId, {
        quizId,
        deletedCount: count,
      });

      // No return value - successful deletion indicated by no exception
    } catch (error) {
      logger.logRequestError("deleteQuiz", correlationId || "unknown", error, userId, { quizId });
      throw error;
    }
  }

  /**
   * Updates a question's text
   * Verifies that the question belongs to a quiz owned by the authenticated user
   * @param questionId - The UUID of the question to update
   * @param userId - The user ID for authorization (IDOR protection)
   * @param data - Update data containing new question text
   * @param correlationId - Request correlation ID for tracking
   * @returns Promise<QuestionDetailDTO> - Updated question data with all answers
   * @throws NotFoundError if question doesn't exist or user doesn't have access
   * @throws DatabaseError for database operation errors
   */
  async updateQuestionText(
    questionId: string,
    userId: string,
    data: UpdateQuestionCommand,
    correlationId?: string
  ): Promise<QuestionDetailDTO> {
    const startTime = Date.now();
    logger.logRequestStart("updateQuestionText", correlationId || "unknown", userId, { questionId, data });

    try {
      // Step 1: First verify that the question belongs to a quiz owned by the user
      // This is crucial for IDOR protection
      const { data: verificationData, error: verificationError } = await this.supabase
        .from("quiz_questions")
        .select(
          `
          id,
          quizzes!inner (
            user_id
          )
        `
        )
        .eq("id", questionId)
        .eq("quizzes.user_id", userId)
        .single();

      if (verificationError) {
        logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", false, verificationError);

        if (verificationError.code === "PGRST116") {
          // No rows returned - question not found or doesn't belong to user's quiz
          throw new NotFoundError("Question", questionId, correlationId);
        }

        throw new DatabaseError("updateQuestionText", verificationError, correlationId);
      }

      if (!verificationData) {
        throw new NotFoundError("Question", questionId, correlationId);
      }

      logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", true);

      // Step 2: Update the question text with new data
      const { error: updateError } = await this.supabase
        .from("quiz_questions")
        .update({
          question_text: data.question_text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", questionId);

      if (updateError) {
        logger.logDatabaseOperation("update", "quiz_questions", correlationId || "unknown", false, updateError);
        throw new DatabaseError("updateQuestionText", updateError, correlationId);
      }

      logger.logDatabaseOperation("update", "quiz_questions", correlationId || "unknown", true);

      // Step 3: Fetch the updated question with all answers
      const { data: questionData, error: selectError } = await this.supabase
        .from("quiz_questions")
        .select(
          `
          *,
          answers (*)
        `
        )
        .eq("id", questionId)
        .single();

      if (selectError) {
        logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", false, selectError);

        if (selectError.code === "PGRST116") {
          throw new NotFoundError("Question", questionId, correlationId);
        }

        throw new DatabaseError("updateQuestionText", selectError, correlationId);
      }

      if (!questionData) {
        throw new NotFoundError("Question", questionId, correlationId);
      }

      logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", true);

      // Step 4: Transform answers data
      const questionAnswers: AnswerDTO[] = (questionData.answers || [])
        .sort((a: unknown, b: unknown) => {
          const aTime = new Date((a as { created_at: string }).created_at).getTime();
          const bTime = new Date((b as { created_at: string }).created_at).getTime();
          return aTime - bTime;
        })
        .map((answer: unknown) => {
          const ans = answer as { id: string; answer_text: string; is_correct: boolean; source: string };
          return {
            id: ans.id,
            answer_text: ans.answer_text,
            is_correct: Boolean(ans.is_correct),
            source: ans.source,
          };
        });

      // Step 5: Parse and validate metadata
      let metadata: unknown = null;
      if (questionData.metadata) {
        try {
          metadata =
            typeof questionData.metadata === "string" ? JSON.parse(questionData.metadata) : questionData.metadata;
        } catch (parseError) {
          logger.warn("Failed to parse question metadata", {
            correlationId,
            metadata: {
              questionId,
              error: parseError instanceof Error ? parseError.message : String(parseError),
            },
          });
          metadata = null;
        }
      }

      // Step 6: Build and return the QuestionDetailDTO
      const questionDetail: QuestionDetailDTO = {
        id: questionData.id,
        question_text: questionData.question_text,
        metadata: metadata as QuestionDetailDTO["metadata"],
        created_at: questionData.created_at,
        updated_at: questionData.updated_at,
        answers: questionAnswers,
      };

      logger.logRequestComplete("updateQuestionText", correlationId || "unknown", Date.now() - startTime, userId, {
        questionId,
        question_text: data.question_text,
      });

      return questionDetail;
    } catch (error) {
      logger.logRequestError("updateQuestionText", correlationId || "unknown", error, userId, { questionId, data });
      throw error;
    }
  }

  /**
   * Updates the text of an existing answer.
   * Also updates the question's updated_at timestamp and conditionally changes answer source to 'ai-edited'.
   * @param answerId - The UUID of the answer to update
   * @param userId - The user ID for authorization
   * @param data - The update data containing new answer text
   * @param correlationId - Request correlation ID for tracking
   * @returns Promise<AnswerDTO> - The updated answer data
   * @throws AppError for various error conditions
   */
  async updateAnswer(
    answerId: string,
    userId: string,
    data: UpdateAnswerCommand,
    correlationId?: string
  ): Promise<AnswerDTO> {
    const startTime = Date.now();
    logger.logRequestStart("updateAnswer", correlationId || "unknown", userId, { answerId, data });

    try {
      // Step 1: First verify that the answer belongs to a quiz owned by the user
      // This is crucial for IDOR protection - we need to traverse the relationship chain
      const { data: verificationData, error: verificationError } = await this.supabase
        .from("answers")
        .select(
          `
          id,
          source,
          quiz_questions!inner (
            id,
            quizzes!inner (
              user_id
            )
          )
        `
        )
        .eq("id", answerId)
        .eq("quiz_questions.quizzes.user_id", userId)
        .single();

      if (verificationError) {
        logger.logDatabaseOperation("select", "answers", correlationId || "unknown", false, verificationError);

        if (verificationError.code === "PGRST116") {
          // No rows returned - answer not found or doesn't belong to user's quiz
          throw new NotFoundError("Answer", answerId, correlationId);
        }

        throw new DatabaseError("updateAnswer", verificationError, correlationId);
      }

      if (!verificationData) {
        throw new NotFoundError("Answer", answerId, correlationId);
      }

      logger.logDatabaseOperation("select", "answers", correlationId || "unknown", true);

      // Step 2: Update the answer text and conditionally change source
      const updateData: {
        answer_text: string;
        source?: string;
      } = {
        answer_text: data.answer_text,
      };

      // If the answer was originally AI-generated, mark it as edited
      if (verificationData.source === "ai") {
        updateData.source = "ai-edited";
      }

      const { error: updateAnswerError } = await this.supabase.from("answers").update(updateData).eq("id", answerId);

      if (updateAnswerError) {
        logger.logDatabaseOperation("update", "answers", correlationId || "unknown", false, updateAnswerError);
        throw new DatabaseError("updateAnswer", updateAnswerError, correlationId);
      }

      logger.logDatabaseOperation("update", "answers", correlationId || "unknown", true);

      // Note: The database triggers will automatically update updated_at timestamps
      // in quiz_questions and quizzes tables, so no manual updates needed

      // Step 3: Fetch the updated answer
      const { data: answerData, error: selectError } = await this.supabase
        .from("answers")
        .select("*")
        .eq("id", answerId)
        .single();

      if (selectError) {
        logger.logDatabaseOperation("select", "answers", correlationId || "unknown", false, selectError);

        if (selectError.code === "PGRST116") {
          throw new NotFoundError("Answer", answerId, correlationId);
        }

        throw new DatabaseError("updateAnswer", selectError, correlationId);
      }

      if (!answerData) {
        throw new NotFoundError("Answer", answerId, correlationId);
      }

      logger.logDatabaseOperation("select", "answers", correlationId || "unknown", true);

      // Step 4: Transform and return the AnswerDTO
      const answerDTO: AnswerDTO = {
        id: answerData.id,
        answer_text: answerData.answer_text,
        is_correct: answerData.is_correct,
        source: answerData.source,
      };

      logger.logRequestComplete("updateAnswer", correlationId || "unknown", Date.now() - startTime, userId, {
        answerId,
        answer_text: data.answer_text,
        source_changed: verificationData.source === "ai" && answerData.source === "ai-edited",
      });

      return answerDTO;
    } catch (error) {
      logger.logRequestError("updateAnswer", correlationId || "unknown", error, userId, { answerId, data });
      throw error;
    }
  }

  /**
   * Deletes a question and all its associated answers.
   * This operation is permanent and irreversible.
   * The quiz's updated_at field is automatically updated.
   * Uses database cascade delete to remove all related answers.
   *
   * @param questionId - The UUID of the question to delete
   * @param userId - The user ID for authorization (IDOR protection)
   * @param correlationId - Request correlation ID for tracking
   * @returns Promise<void> - No return value on successful deletion
   * @throws NotFoundError if question doesn't exist or user doesn't have access
   * @throws DatabaseError for database operation errors
   */
  async deleteQuestion(questionId: string, userId: string, correlationId?: string): Promise<void> {
    const startTime = Date.now();
    logger.logRequestStart("deleteQuestion", correlationId || "unknown", userId, { questionId });

    try {
      // Step 1: Verify that the question exists and belongs to a quiz owned by the user
      // This is crucial for IDOR protection - we need to get the quiz_id for updating updated_at
      const { data: verificationData, error: verificationError } = await this.supabase
        .from("quiz_questions")
        .select(
          `
          id,
          quiz_id,
          quizzes!inner (
            user_id
          )
        `
        )
        .eq("id", questionId)
        .eq("quizzes.user_id", userId)
        .single();

      if (verificationError) {
        logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", false, verificationError);

        if (verificationError.code === "PGRST116") {
          // No rows returned - question not found or doesn't belong to user's quiz
          throw new NotFoundError("Question", questionId, correlationId);
        }

        throw new DatabaseError("deleteQuestion", verificationError, correlationId);
      }

      if (!verificationData) {
        throw new NotFoundError("Question", questionId, correlationId);
      }

      logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", true);

      const quizId = verificationData.quiz_id;

      // Step 2: Delete the question
      // The database schema has ON DELETE CASCADE configured for answers table,
      // so all related answers will be automatically deleted
      const { error: deleteError, count } = await this.supabase
        .from("quiz_questions")
        .delete({ count: "exact" })
        .eq("id", questionId);

      if (deleteError) {
        logger.logDatabaseOperation("delete", "quiz_questions", correlationId || "unknown", false, deleteError);
        throw new DatabaseError("deleteQuestion", deleteError, correlationId);
      }

      // Step 3: Check if any row was deleted
      // If count is 0, something unexpected happened (question was deleted between verification and deletion)
      if (count === 0) {
        logger.logDatabaseOperation("delete", "quiz_questions", correlationId || "unknown", false, {
          message: "No rows deleted - question may have been deleted concurrently",
        });
        throw new NotFoundError("Question", questionId, correlationId);
      }

      logger.logDatabaseOperation("delete", "quiz_questions", correlationId || "unknown", true);

      // Step 4: Update the quiz's updated_at timestamp
      // This ensures the quiz reflects the recent change
      const { error: updateError } = await this.supabase
        .from("quizzes")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", quizId);

      if (updateError) {
        logger.logDatabaseOperation("update", "quizzes", correlationId || "unknown", false, updateError);
        // Log warning but don't fail the operation - the question was successfully deleted
        logger.warn("Failed to update quiz updated_at after question deletion", {
          correlationId,
          quizId,
          error: updateError,
        });
      } else {
        logger.logDatabaseOperation("update", "quizzes", correlationId || "unknown", true);
      }

      logger.logRequestComplete("deleteQuestion", correlationId || "unknown", Date.now() - startTime, userId, {
        questionId,
        quizId,
      });
    } catch (error) {
      logger.logRequestError("deleteQuestion", correlationId || "unknown", error, userId, { questionId });
      throw error;
    }
  }

  /**
   * Regenerates incorrect answers for a question using AI
   * Keeps the question text and correct answer unchanged
   * Deletes all existing incorrect answers and generates 3 new ones
   * @param questionId - The UUID of the question to regenerate answers for
   * @param userId - The user ID for authorization (IDOR protection)
   * @param command - Regeneration parameters (temperature, seed)
   * @param correlationId - Request correlation ID for tracking
   * @returns Promise<QuestionDetailDTO> - Question with newly regenerated answers
   * @throws NotFoundError if question doesn't exist or user doesn't have access
   * @throws ForbiddenError if user doesn't own the quiz containing the question
   * @throws AIGenerationError if AI service fails to generate answers
   * @throws DatabaseError for database operation errors
   */
  async regenerateIncorrectAnswers(
    questionId: string,
    userId: string,
    command: RegenerateAnswersCommand,
    correlationId?: string
  ): Promise<QuestionDetailDTO> {
    const startTime = Date.now();
    logger.logRequestStart("regenerateIncorrectAnswers", correlationId || "unknown", userId, {
      questionId,
      command,
    });

    try {
      // Step 1: Fetch question with answers and verify ownership through parent quiz
      const { data: questionData, error: queryError } = await this.supabase
        .from("quiz_questions")
        .select(
          `
          *,
          answers (*),
          quizzes!inner (
            user_id
          )
        `
        )
        .eq("id", questionId)
        .single();

      if (queryError) {
        logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", false, queryError);

        if (queryError.code === "PGRST116") {
          throw new NotFoundError("Question", questionId, correlationId);
        }

        throw new DatabaseError("regenerateIncorrectAnswers", queryError, correlationId);
      }

      if (!questionData) {
        throw new NotFoundError("Question", questionId, correlationId);
      }

      logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", true);

      // Step 2: Verify authorization - check if user owns the parent quiz
      const quizUserId = (questionData.quizzes as { user_id: string }).user_id;
      if (quizUserId !== userId) {
        logger.warn("Unauthorized access attempt", {
          correlationId,
          metadata: {
            questionId,
            userId,
            quizUserId,
          },
        });
        throw new ForbiddenError(
          "You don't have permission to modify this question",
          {
            questionId,
            userId,
            quizUserId,
          },
          correlationId
        );
      }

      // Step 3: Find the correct answer
      const answers = questionData.answers as {
        id: string;
        answer_text: string;
        is_correct: boolean;
        source: string;
      }[];
      const correctAnswer = answers.find((a) => a.is_correct);

      if (!correctAnswer) {
        throw new DatabaseError(
          "regenerateIncorrectAnswers",
          new Error("Question has no correct answer"),
          correlationId
        );
      }

      // Step 4: Call AI service to generate new incorrect answers with timeout
      logger.info("Calling AI service to generate incorrect answers", {
        correlationId,
        metadata: {
          questionId,
          question: questionData.question_text,
          temperature: command.temperature,
          seed: command.seed,
        },
      });

      let aiResult;
      try {
        // Add 30-second timeout to AI service call
        aiResult = await withTimeout(
          generateIncorrectAnswers({
            question: questionData.question_text,
            correctAnswer: correctAnswer.answer_text,
            temperature: command.temperature,
            seed: command.seed,
          }),
          30000, // 30 seconds
          "AI service timeout - request took longer than 30 seconds"
        );
      } catch (aiError) {
        logger.error("AI service failed to generate answers", {
          correlationId,
          metadata: {
            questionId,
            error: aiError instanceof Error ? aiError.message : String(aiError),
          },
        });
        throw new AIGenerationError(
          "Failed to generate incorrect answers",
          aiError instanceof Error ? aiError : new Error(String(aiError)),
          correlationId
        );
      }

      logger.info("AI service generated incorrect answers", {
        correlationId,
        metadata: {
          questionId,
          answersCount: aiResult.incorrectAnswers.length,
        },
      });

      // Step 5: Delete all existing incorrect answers (is_correct = false)
      const { error: deleteError } = await this.supabase
        .from("answers")
        .delete()
        .eq("question_id", questionId)
        .eq("is_correct", false);

      if (deleteError) {
        logger.logDatabaseOperation("delete", "answers", correlationId || "unknown", false, deleteError);
        throw new DatabaseError("regenerateIncorrectAnswers", deleteError, correlationId);
      }

      logger.logDatabaseOperation("delete", "answers", correlationId || "unknown", true);

      // Step 6: Insert new incorrect answers with source='ai'
      const newAnswers = aiResult.incorrectAnswers.map((answerText) => ({
        question_id: questionId,
        answer_text: answerText,
        is_correct: false,
        source: "ai",
      }));

      const { error: insertError } = await this.supabase.from("answers").insert(newAnswers);

      if (insertError) {
        logger.logDatabaseOperation("insert", "answers", correlationId || "unknown", false, insertError);
        throw new DatabaseError("regenerateIncorrectAnswers", insertError, correlationId);
      }

      logger.logDatabaseOperation("insert", "answers", correlationId || "unknown", true);

      // Step 7: Update question metadata with regeneration info
      const updatedMetadata: QuestionMetadata = {
        ...aiResult.metadata,
        regenerated_at: new Date().toISOString(),
      };

      const { error: updateError } = await this.supabase
        .from("quiz_questions")
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", questionId);

      if (updateError) {
        logger.logDatabaseOperation("update", "quiz_questions", correlationId || "unknown", false, updateError);
        throw new DatabaseError("regenerateIncorrectAnswers", updateError, correlationId);
      }

      logger.logDatabaseOperation("update", "quiz_questions", correlationId || "unknown", true);

      // Step 8: Fetch and return the updated question with all answers
      const { data: updatedQuestion, error: selectError } = await this.supabase
        .from("quiz_questions")
        .select(
          `
          *,
          answers (*)
        `
        )
        .eq("id", questionId)
        .single();

      if (selectError) {
        logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", false, selectError);
        throw new DatabaseError("regenerateIncorrectAnswers", selectError, correlationId);
      }

      if (!updatedQuestion) {
        throw new NotFoundError("Question", questionId, correlationId);
      }

      logger.logDatabaseOperation("select", "quiz_questions", correlationId || "unknown", true);

      // Step 9: Transform to QuestionDetailDTO
      const questionAnswers: AnswerDTO[] = (updatedQuestion.answers || [])
        .sort((a: unknown, b: unknown) => {
          const aTime = new Date((a as { created_at: string }).created_at).getTime();
          const bTime = new Date((b as { created_at: string }).created_at).getTime();
          return aTime - bTime;
        })
        .map((answer: unknown) => {
          const ans = answer as { id: string; answer_text: string; is_correct: boolean; source: string };
          return {
            id: ans.id,
            answer_text: ans.answer_text,
            is_correct: Boolean(ans.is_correct),
            source: ans.source,
          };
        });

      const questionDetail: QuestionDetailDTO = {
        id: updatedQuestion.id,
        question_text: updatedQuestion.question_text,
        metadata: updatedMetadata as unknown as QuestionDetailDTO["metadata"],
        created_at: updatedQuestion.created_at,
        updated_at: updatedQuestion.updated_at,
        answers: questionAnswers,
      };

      logger.logRequestComplete(
        "regenerateIncorrectAnswers",
        correlationId || "unknown",
        Date.now() - startTime,
        userId,
        {
          questionId,
          answersCount: questionAnswers.length,
        }
      );

      return questionDetail;
    } catch (error) {
      logger.logRequestError("regenerateIncorrectAnswers", correlationId || "unknown", error, userId, {
        questionId,
        command,
      });
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
