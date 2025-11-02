import { useState, useCallback } from "react";
import type { QuizzesListDTO, QuizListItemDTO, ErrorResponse, QuizSummaryDTO } from "@/types";

type GenerationState = "idle" | "loading" | "error";

interface UseDashboardReturn {
  quizzes: QuizzesListDTO;
  generationState: GenerationState;
  generationError: string | null;
  quizToDelete: QuizListItemDTO | null;
  handleGenerateQuiz: (url: string) => Promise<void>;
  handleDeleteRequest: (quizId: string) => void;
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;
}

export function useDashboard(initialQuizzes: QuizzesListDTO): UseDashboardReturn {
  const [quizzes, setQuizzes] = useState<QuizzesListDTO>(initialQuizzes);
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<QuizListItemDTO | null>(null);

  const handleGenerateQuiz = useCallback(async (url: string) => {
    setGenerationState("loading");
    setGenerationError(null);

    try {
      const response = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source_url: url }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();

        // Mapowanie błędów API na przyjazne komunikaty
        const errorMessages: Record<string, string> = {
          VALIDATION_ERROR: "Niepoprawny format URL",
          QUIZLET_PRIVATE: "Ten zestaw jest prywatny. Użyj publicznego zestawu.",
          QUIZLET_NOT_FOUND: "Nie znaleziono zestawu Quizlet",
          QUIZLET_EMPTY: "Ten zestaw nie zawiera fiszek",
          AI_GENERATION_FAILED: "Nie udało się wygenerować pytań. Spróbuj ponownie.",
          RATE_LIMIT_EXCEEDED: "Za dużo żądań. Spróbuj ponownie za chwilę.",
        };

        const errorMessage = errorMessages[errorData.error.code] || "Wystąpił nieoczekiwany błąd";
        setGenerationError(errorMessage);
        setGenerationState("error");
        return;
      }

      const newQuiz: QuizSummaryDTO = await response.json();

      // Przekierowanie do strony edycji nowo utworzonego quizu
      window.location.href = `/quizzes/${newQuiz.id}/edit`;
    } catch (error) {
      console.error("Failed to generate quiz:", error);
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
        console.error("Failed to delete quiz");
      }
    } catch (error) {
      // Przywracamy poprzedni stan w przypadku błędu
      setQuizzes(previousQuizzes);
      console.error("Failed to delete quiz:", error);
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
    quizToDelete,
    handleGenerateQuiz,
    handleDeleteRequest,
    handleConfirmDelete,
    handleCancelDelete,
  };
}
