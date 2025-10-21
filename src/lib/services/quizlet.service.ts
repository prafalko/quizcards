import type { QuizletSet, ErrorResponse } from "../../types";

/**
 * Quizlet Service - handles fetching flashcards from Quizlet
 * Currently uses mocks for development
 */

/**
 * Extracts the Quizlet set ID from a Quizlet URL
 * @param url - Full Quizlet set URL
 * @returns Quizlet set ID
 * @throws Error if URL format is invalid
 */
export function extractQuizletSetId(url: string): string {
  const regex = /quizlet\.com\/(\d+)\//;
  const match = url.match(regex);

  if (!match || !match[1]) {
    throw new Error("Could not extract set ID from URL");
  }

  return match[1];
}

/**
 * Fetches flashcards from a Quizlet set
 * MOCK IMPLEMENTATION - returns hardcoded data for development
 *
 * @param setId - Quizlet set ID
 * @returns QuizletSet with flashcards
 * @throws ErrorResponse for various error conditions
 */
export async function fetchQuizletSet(setId: string): Promise<QuizletSet> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock different scenarios based on set ID
  if (setId === "999999999") {
    const error: ErrorResponse = {
      error: {
        code: "QUIZLET_NOT_FOUND",
        message: "Quizlet set not found",
      },
    };
    throw error;
  }

  if (setId === "888888888") {
    const error: ErrorResponse = {
      error: {
        code: "QUIZLET_PRIVATE",
        message: "This Quizlet set is private",
      },
    };
    throw error;
  }

  if (setId === "777777777") {
    const error: ErrorResponse = {
      error: {
        code: "QUIZLET_EMPTY",
        message: "Quizlet set contains no flashcards",
      },
    };
    throw error;
  }

  // Mock successful response with biology flashcards
  return {
    id: setId,
    title: "Biology Flashcards",
    flashcards: [
      {
        term: "What is the powerhouse of the cell?",
        definition: "Mitochondria",
      },
      {
        term: "What process do plants use to convert sunlight into energy?",
        definition: "Photosynthesis",
      },
      {
        term: "What is the basic unit of life?",
        definition: "Cell",
      },
      {
        term: "What is DNA an acronym for?",
        definition: "Deoxyribonucleic Acid",
      },
      {
        term: "What is the process by which cells divide?",
        definition: "Mitosis",
      },
    ],
  };
}
