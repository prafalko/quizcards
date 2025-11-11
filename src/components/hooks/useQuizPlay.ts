import { useState, useCallback, useEffect } from "react";
import type {
  QuizDetailDTO,
  QuizQuestionViewModel,
  UserAnswer,
  UpdateQuizCommand,
  QuizSummaryDTO,
  ErrorResponse
} from "@/types";
import { logger } from "@/lib/services/logger.service";

type QuizPhase = "loading" | "playing" | "finished";

interface UseQuizPlayReturn {
  quizPhase: QuizPhase;
  shuffledQuestions: QuizQuestionViewModel[];
  currentQuestionIndex: number;
  userAnswers: UserAnswer[];
  handleAnswerSelect: (answerId: string) => void;
}

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useQuizPlay(initialQuiz: QuizDetailDTO): UseQuizPlayReturn {
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("loading");
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestionViewModel[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);

  // Initialize quiz on mount
  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        // Step 1: Check if quiz has questions
        if (!initialQuiz.questions || initialQuiz.questions.length === 0) {
          setQuizPhase("finished"); // Will show empty quiz message
          return;
        }

        // Step 2: Shuffle questions and their answers
        const shuffledQuestionsData: QuizQuestionViewModel[] = shuffleArray(
          initialQuiz.questions.map(question => ({
            ...question,
            answers: shuffleArray(question.answers)
          }))
        );

        setShuffledQuestions(shuffledQuestionsData);

        // Step 3: Update quiz status to published if it's draft
        if (initialQuiz.status === "draft") {
          try {
            const updateCommand: UpdateQuizCommand = { status: "published" };
            const response = await fetch(`/api/quizzes/${initialQuiz.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(updateCommand),
            });

            if (!response.ok) {
              // Log error but don't prevent quiz from starting
              const errorData: ErrorResponse = await response.json().catch(() => ({}));
              logger.error("Failed to update quiz status to published", {
                error: {
                  message: `HTTP ${response.status}: ${response.statusText}`,
                  code: errorData.error?.code,
                  details: { quizId: initialQuiz.id, status: response.status },
                },
              });
            }
          } catch (error) {
            // Log error but don't prevent quiz from starting
            logger.error("Failed to update quiz status to published", {
              error: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                details: { quizId: initialQuiz.id },
              },
            });
          }
        }

        // Step 4: Start the quiz
        setQuizPhase("playing");
      } catch (error) {
        logger.error("Failed to initialize quiz", {
          error: {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            details: { quizId: initialQuiz.id },
          },
        });
        setQuizPhase("finished"); // Show error state
      }
    };

    initializeQuiz();
  }, [initialQuiz]);

  const handleAnswerSelect = useCallback((answerId: string) => {
    if (quizPhase !== "playing" || shuffledQuestions.length === 0) return;

    const currentQuestion = shuffledQuestions[currentQuestionIndex];

    // Record the user's answer
    const newUserAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      answerId,
    };

    setUserAnswers(prev => [...prev, newUserAnswer]);

    // Check if this is the last question
    if (currentQuestionIndex >= shuffledQuestions.length - 1) {
      // Quiz finished - save answers and redirect
      setQuizPhase("finished");

      // Save answers to sessionStorage for results page
      try {
        sessionStorage.setItem(`quiz-${initialQuiz.id}-answers`, JSON.stringify([...userAnswers, newUserAnswer]));
        sessionStorage.setItem(`quiz-${initialQuiz.id}-questions`, JSON.stringify(shuffledQuestions));
      } catch (error) {
        logger.error("Failed to save quiz session data", {
          error: {
            message: error instanceof Error ? error.message : String(error),
            details: { quizId: initialQuiz.id },
          },
        });
      }

      // Redirect to results page
      window.location.assign(`/quizzes/${initialQuiz.id}/results`);
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [quizPhase, shuffledQuestions, currentQuestionIndex, userAnswers, initialQuiz.id]);

  return {
    quizPhase,
    shuffledQuestions,
    currentQuestionIndex,
    userAnswers,
    handleAnswerSelect,
  };
}
