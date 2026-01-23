import { useState, useCallback } from "react";

import type {
  QuizDetailDTO,
  QuestionDetailDTO,
  ErrorResponse,
  UpdateQuizCommand,
  UpdateQuestionCommand,
  UpdateAnswerCommand,
  RegenerateAnswersCommand,
} from "@/types";

interface UseQuizEditReturn {
  // State

  quiz: QuizDetailDTO;

  originalQuiz: QuizDetailDTO;

  isDirty: boolean;

  isSaving: boolean;

  isRegenerating: string | null; // question ID being regenerated, null if not regenerating

  questionToDeleteId: string | null;

  saveError: string | null;

  deleteError: string | null;

  regenerateError: string | null;

  // Actions

  updateTitle: (newTitle: string) => void;

  updateQuestion: (questionId: string, newText: string) => void;

  updateAnswer: (questionId: string, answerId: string, newText: string) => void;

  handleSaveChanges: () => Promise<void>;

  handleDiscardChanges: () => void;

  handleDeleteQuestionRequest: (questionId: string) => void;

  handleConfirmDeleteQuestion: () => Promise<void>;

  handleCancelDeleteQuestion: () => void;

  handleRegenerateAnswers: (questionId: string) => Promise<void>;
}

export function useQuizEdit(initialQuiz: QuizDetailDTO): UseQuizEditReturn {
  const [quiz, setQuiz] = useState<QuizDetailDTO>(initialQuiz);
  const [originalQuiz, setOriginalQuiz] = useState<QuizDetailDTO>(initialQuiz);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [questionToDeleteId, setQuestionToDeleteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const isDirty = hasChanges || hasQuizChanged(quiz, originalQuiz);

  const updateTitle = useCallback((newTitle: string) => {
    setQuiz((prev) => ({ ...prev, title: newTitle }));

    setHasChanges(true);
  }, []);

  const updateQuestion = useCallback((questionId: string, newText: string) => {
    setQuiz((prev) => ({
      ...prev,

      questions: prev.questions.map((q) => (q.id === questionId ? { ...q, question_text: newText } : q)),
    }));

    setHasChanges(true);
  }, []);

  const updateAnswer = useCallback((questionId: string, answerId: string, newText: string) => {
    setQuiz((prev) => ({
      ...prev,

      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,

              answers: q.answers.map((a) => (a.id === answerId ? { ...a, answer_text: newText } : a)),
            }
          : q
      ),
    }));

    setHasChanges(true);
  }, []);

  const handleSaveChanges = useCallback(async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);

    setSaveError(null);

    try {
      const quizId = quiz.id;

      // Step 1: Check if title changed and update quiz

      if (quiz.title !== originalQuiz.title) {
        const updateQuizCommand: UpdateQuizCommand = { title: quiz.title };

        const response = await fetch(`/api/quizzes/${quizId}`, {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(updateQuizCommand),
        });

        if (!response.ok) {
          const errorData: ErrorResponse = await response.json();

          throw new Error(errorData.error.message || "Failed to update quiz title");
        }
      }

      // Step 2: Find deleted questions

      const deletedQuestionIds = originalQuiz.questions

        .filter((originalQ) => !quiz.questions.some((q) => q.id === originalQ.id))

        .map((q) => q.id);

      // Delete questions

      for (const questionId of deletedQuestionIds) {
        const response = await fetch(`/api/questions/${questionId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData: ErrorResponse = await response.json();

          throw new Error(errorData.error.message || "Failed to delete question");
        }
      }

      // Step 3: Update changed questions

      for (const question of quiz.questions) {
        const originalQuestion = originalQuiz.questions.find((q) => q.id === question.id);

        if (!originalQuestion) continue; // New question (shouldn't happen in edit mode)

        if (question.question_text !== originalQuestion.question_text) {
          const updateQuestionCommand: UpdateQuestionCommand = {
            question_text: question.question_text,
          };

          const response = await fetch(`/api/questions/${question.id}`, {
            method: "PATCH",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(updateQuestionCommand),
          });

          if (!response.ok) {
            const errorData: ErrorResponse = await response.json();

            throw new Error(errorData.error.message || "Failed to update question");
          }
        }
      }

      // Step 4: Update changed answers

      for (const question of quiz.questions) {
        const originalQuestion = originalQuiz.questions.find((q) => q.id === question.id);

        if (!originalQuestion) continue;

        for (const answer of question.answers) {
          const originalAnswer = originalQuestion.answers.find((a) => a.id === answer.id);

          if (!originalAnswer) continue;

          if (answer.answer_text !== originalAnswer.answer_text) {
            const updateAnswerCommand: UpdateAnswerCommand = {
              answer_text: answer.answer_text,
            };

            const response = await fetch(`/api/answers/${answer.id}`, {
              method: "PATCH",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify(updateAnswerCommand),
            });

            if (!response.ok) {
              const errorData: ErrorResponse = await response.json();

              throw new Error(errorData.error.message || "Failed to update answer");
            }
          }
        }
      }

      // Step 5: Mark changes as saved

      setHasChanges(false);

      setOriginalQuiz(quiz); // Update original quiz to current state

      // TODO: Show success toast notification
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas zapisywania zmian";

      setSaveError(errorMessage);

      // TODO: Show error toast notification
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, isSaving, quiz, originalQuiz]);

  const handleDiscardChanges = useCallback(() => {
    setQuiz(originalQuiz);

    setQuestionToDeleteId(null);

    setHasChanges(false);

    setSaveError(null);

    setDeleteError(null);

    setRegenerateError(null);
  }, [originalQuiz]);

  const handleDeleteQuestionRequest = useCallback((questionId: string) => {
    setQuestionToDeleteId(questionId);
  }, []);

  const handleConfirmDeleteQuestion = useCallback(async () => {
    if (!questionToDeleteId) return;

    const previousQuiz = quiz;

    const questionId = questionToDeleteId;

    // Optimistic update - remove question from UI immediately

    setQuiz((prev) => ({
      ...prev,

      questions: prev.questions.filter((q) => q.id !== questionId),
    }));

    setQuestionToDeleteId(null);

    setDeleteError(null);

    setHasChanges(true);

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Rollback on error

        setQuiz(previousQuiz);

        const errorData: ErrorResponse = await response.json();

        throw new Error(errorData.error.message || "Failed to delete question");
      }

      // TODO: Show success toast notification
    } catch (error) {
      // Rollback on error

      setQuiz(previousQuiz);

      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas usuwania pytania";

      setDeleteError(errorMessage);

      // TODO: Show error toast notification
    }
  }, [questionToDeleteId, quiz]);

  const handleCancelDeleteQuestion = useCallback(() => {
    setQuestionToDeleteId(null);
  }, []);

  const handleRegenerateAnswers = useCallback(async (questionId: string) => {
    setRegenerateError(null);

    setIsRegenerating(questionId);

    try {
      const regenerateCommand: RegenerateAnswersCommand = {
        temperature: 0.7, // Default temperature
      };

      const response = await fetch(`/api/questions/${questionId}/regenerate`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(regenerateCommand),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();

        throw new Error(errorData.error.message || "Failed to regenerate answers");
      }

      const updatedQuestion: QuestionDetailDTO = await response.json();

      // Update both quiz and originalQuiz with the regenerated question
      // This ensures the regenerated answers are immediately saved to the "original" state
      // so that isDirty doesn't become true just because of regeneration

      setQuiz((prev) => {
        const updated = {
          ...prev,

          questions: prev.questions.map((q) => (q.id === questionId ? updatedQuestion : q)),
        };

        // Also update originalQuiz to match the new state
        setOriginalQuiz(updated);

        return updated;
      });

      // No need to set hasChanges=true since we updated both quiz and originalQuiz

      // TODO: Show success toast notification
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas generowania odpowiedzi";

      setRegenerateError(errorMessage);

      // TODO: Show error toast notification
    } finally {
      setIsRegenerating(null);
    }
  }, []);

  return {
    quiz,
    originalQuiz,
    isDirty,
    isSaving,
    isRegenerating,
    questionToDeleteId,
    saveError,
    deleteError,
    regenerateError,
    updateTitle,
    updateQuestion,
    updateAnswer,
    handleSaveChanges,
    handleDiscardChanges,
    handleDeleteQuestionRequest,
    handleConfirmDeleteQuestion,
    handleCancelDeleteQuestion,
    handleRegenerateAnswers,
  };
}

function hasQuizChanged(current: QuizDetailDTO, original: QuizDetailDTO): boolean {
  if (current.title !== original.title) return true;
  if (current.questions.length !== original.questions.length) return true;

  for (const question of current.questions) {
    const originalQuestion = original.questions.find((q) => q.id === question.id);
    if (!originalQuestion) return true;
    if (question.question_text !== originalQuestion.question_text) return true;
    if (question.answers.length !== originalQuestion.answers.length) return true;

    for (const answer of question.answers) {
      const originalAnswer = originalQuestion.answers.find((a) => a.id === answer.id);
      if (!originalAnswer || answer.answer_text !== originalAnswer.answer_text) return true;
    }
  }

  return false;
}
