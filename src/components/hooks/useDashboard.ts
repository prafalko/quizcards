import { useState, useCallback } from "react";
import type { QuizzesListDTO, QuizListItemDTO, ErrorResponse, QuizSummaryDTO } from "@/types";
import { logger } from "@/lib/services/logger.service";
type GenerationState = "idle" | "loading" | "error";
interface UseDashboardReturn {
  quizzes: QuizzesListDTO;
  generationState: GenerationState;
  generationError: string | null;
  errorCode: string | null;
  errorDetails: ErrorResponse["error"]["details"] | undefined;
  quizToDelete: QuizListItemDTO | null;
  handleGenerateQuiz: (url: string, jsonData?: unknown) => Promise<void>;
  handleDeleteRequest: (quizId: string) => void;
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;
}
export function useDashboard(initialQuizzes: QuizzesListDTO): UseDashboardReturn {
  const [quizzes, setQuizzes] = useState<QuizzesListDTO>(initialQuizzes);
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorResponse["error"]["details"] | undefined>(undefined);
  const [quizToDelete, setQuizToDelete] = useState<QuizListItemDTO | null>(null);
  const handleGenerateQuiz = useCallback(async (url: string, jsonData?: unknown) => {
    setGenerationState("loading");
    setGenerationError(null);
    setErrorCode(null);
    setErrorDetails(undefined);
    try {
      const requestBody: { source_url: string; quizlet_json?: unknown } = { source_url: url };
      if (jsonData) {
        requestBody.quizlet_json = jsonData;
      }

      const response = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        // Mapowanie błędów API na przyjazne komunikaty
        const errorMessages: Record<string, string> = {
          VALIDATION_ERROR: "Niepoprawny format URL",
          QUIZLET_PRIVATE: "Ten zestaw jest prywatny. Użyj publicznego zestawu.",
          QUIZLET_NOT_FOUND: "Nie znaleziono zestawu Quizlet",
          QUIZLET_EMPTY: "Ten zestaw nie zawiera fiszek",
          QUIZLET_SCRAPER_FAILED: "Automatyczne pobieranie nie powiodło się",
          AI_GENERATION_FAILED: "Nie udało się wygenerować pytań. Spróbuj ponownie.",
          RATE_LIMIT_EXCEEDED: "Za dużo żądań. Spróbuj ponownie za chwilę.",
        };
        const errorMessage = errorMessages[errorData.error.code] || "Wystąpił nieoczekiwany błąd";
        setGenerationError(errorMessage);
        setErrorCode(errorData.error.code);
        setErrorDetails(errorData.error.details);
        setGenerationState("error");
        return;
      }
      const newQuiz: QuizSummaryDTO = await response.json();
      // Przekierowanie do strony edycji nowo utworzonego quizu
      window.location.assign(`/quizzes/${newQuiz.id}/edit`);
    } catch (error) {
      logger.error("Failed to generate quiz", {
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
      setGenerationError("Nie udało się połączyć z serwerem");
      setGenerationState("error");
    }
  }, []);
  const handleDeleteRequest = useCallback(
    (quizId: string) => {
      const quiz = quizzes.find((q) => q.id === quizId);
      if (quiz) {
        setQuizToDelete(quiz);
      }
    },
    [quizzes]
  );
  const handleConfirmDelete = useCallback(async () => {
    if (!quizToDelete) return;
    const quizId = quizToDelete.id;
    const previousQuizzes = quizzes;
    // Optimistic update - usuwamy quiz od razu z UI
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    setQuizToDelete(null);
    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        // Jeśli błąd, przywracamy poprzedni stan
        setQuizzes(previousQuizzes);
        // TODO: Wyświetl toast z błędem
        logger.error("Failed to delete quiz", {
          error: {
            message: `HTTP ${response.status}: ${response.statusText}`,
            details: { quizId, status: response.status },
          },
          quizId,
        });
      }
    } catch (error) {
      // Przywracamy poprzedni stan w przypadku błędu
      setQuizzes(previousQuizzes);
      logger.error("Failed to delete quiz", {
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          details: { quizId },
        },
        quizId,
      });
      // TODO: Wyświetl toast z błędem
    }
  }, [quizToDelete, quizzes]);
  const handleCancelDelete = useCallback(() => {
    setQuizToDelete(null);
  }, []);
  return {
    quizzes,
    generationState,
    generationError,
    errorCode,
    errorDetails,
    quizToDelete,
    handleGenerateQuiz,
    handleDeleteRequest,
    handleConfirmDelete,
    handleCancelDelete,
  };
}
