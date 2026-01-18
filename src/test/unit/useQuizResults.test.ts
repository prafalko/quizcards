import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useQuizResults } from "../../components/hooks/useQuizResults";
import type { QuizDetailDTO, UserAnswer } from "../../types";
import { logger } from "../../lib/services/logger.service";

// Mock logger service
vi.mock("../../lib/services/logger.service", () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Mock window.location
const mockLocationAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    assign: mockLocationAssign,
  },
  writable: true,
});

describe("useQuizResults", () => {
  const mockQuiz: QuizDetailDTO = {
    id: "quiz-123",
    title: "Test Quiz",
    status: "published",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    quizlet_set_id: null,
    source_url: null,
    questions: [
      {
        id: "question-1",
        question_text: "What is 2+2?",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        metadata: {},
        answers: [
          {
            id: "answer-1",
            answer_text: "3",
            is_correct: false,
            source: "user",
          },
          {
            id: "answer-2",
            answer_text: "4",
            is_correct: true,
            source: "user",
          },
          {
            id: "answer-3",
            answer_text: "5",
            is_correct: false,
            source: "user",
          },
        ],
      },
      {
        id: "question-2",
        question_text: "What is the capital of France?",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        metadata: {},
        answers: [
          {
            id: "answer-4",
            answer_text: "London",
            is_correct: false,
            source: "user",
          },
          {
            id: "answer-5",
            answer_text: "Paris",
            is_correct: true,
            source: "user",
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Clear sessionStorage
    sessionStorage.clear();
    // Reset location mock
    mockLocationAssign.mockClear();
  });

  afterEach(() => {
    // Clean up after each test
    sessionStorage.clear();
  });

  describe("SessionStorage Data Handling", () => {
    it("should set error state when sessionStorage has no answers data", async () => {
      // Arrange - sessionStorage is empty (already cleared in beforeEach)

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("error");
      });
      expect(result.current.score).toBeNull();
      expect(result.current.results).toEqual([]);
    });

    it("should process valid sessionStorage data and set ready state", async () => {
      // Arrange
      const userAnswers: UserAnswer[] = [
        { questionId: "question-1", answerId: "answer-2" }, // Correct
        { questionId: "question-2", answerId: "answer-5" }, // Correct
      ];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.score).toBe(100);
      expect(result.current.results).toHaveLength(2);
    });

    it("should handle invalid JSON in sessionStorage and set error state", async () => {
      // Arrange
      sessionStorage.setItem("quiz-quiz-123-answers", "invalid-json{");

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("error");
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Error processing quiz results",
        expect.objectContaining({
          error: expect.objectContaining({
            details: { quizId: "quiz-123" },
          }),
        })
      );
    });

    it("should handle empty array in sessionStorage", async () => {
      // Arrange
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify([]));

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.score).toBe(0);
      expect(result.current.results).toHaveLength(2);
      // All questions should have null userAnswerId
      result.current.results.forEach((question) => {
        expect(question.userAnswerId).toBeNull();
      });
    });
  });

  describe("Result Processing", () => {
    it("should correctly mark answers as correct, user_incorrect, or neutral", async () => {
      // Arrange
      const userAnswers: UserAnswer[] = [
        { questionId: "question-1", answerId: "answer-2" }, // Correct answer
        { questionId: "question-2", answerId: "answer-4" }, // Incorrect answer (London)
      ];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });

      const question1 = result.current.results.find((q) => q.id === "question-1");
      expect(question1).toBeDefined();
      expect(question1?.userAnswerId).toBe("answer-2");

      // Check answer statuses for question 1
      const answer2 = question1?.answers.find((a) => a.id === "answer-2");
      expect(answer2?.status).toBe("correct");
      expect(answer2?.is_correct).toBe(true);

      const answer1 = question1?.answers.find((a) => a.id === "answer-1");
      expect(answer1?.status).toBe("neutral");
      expect(answer1?.is_correct).toBe(false);

      const question2 = result.current.results.find((q) => q.id === "question-2");
      expect(question2).toBeDefined();
      expect(question2?.userAnswerId).toBe("answer-4");

      // Check answer statuses for question 2
      const answer4 = question2?.answers.find((a) => a.id === "answer-4");
      expect(answer4?.status).toBe("user_incorrect");
      expect(answer4?.is_correct).toBe(false);

      const answer5 = question2?.answers.find((a) => a.id === "answer-5");
      expect(answer5?.status).toBe("correct");
      expect(answer5?.is_correct).toBe(true);
    });

    it("should handle questions with no user answer", async () => {
      // Arrange
      const userAnswers: UserAnswer[] = [
        { questionId: "question-1", answerId: "answer-2" },
        // question-2 has no answer
      ];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });

      const question2 = result.current.results.find((q) => q.id === "question-2");
      expect(question2?.userAnswerId).toBeNull();
      // All answers should be neutral or correct (not user_incorrect)
      question2?.answers.forEach((answer) => {
        expect(["correct", "neutral"]).toContain(answer.status);
      });
    });

    it("should handle user answer that does not exist in question answers", async () => {
      // Arrange
      const userAnswers: UserAnswer[] = [{ questionId: "question-1", answerId: "non-existent-answer" }];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });

      const question1 = result.current.results.find((q) => q.id === "question-1");
      expect(question1?.userAnswerId).toBe("non-existent-answer");
      // Score should be 0 since the answer doesn't match any correct answer
      expect(result.current.score).toBe(0);
    });

    it("should handle quiz with no questions", async () => {
      // Arrange
      const emptyQuiz: QuizDetailDTO = {
        ...mockQuiz,
        questions: [],
      };
      const userAnswers: UserAnswer[] = [];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(emptyQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.results).toEqual([]);
      expect(result.current.score).toBe(0);
    });
  });

  describe("Score Calculation", () => {
    it("should calculate 100% score when all answers are correct", async () => {
      // Arrange
      const userAnswers: UserAnswer[] = [
        { questionId: "question-1", answerId: "answer-2" }, // Correct
        { questionId: "question-2", answerId: "answer-5" }, // Correct
      ];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.score).toBe(100);
    });

    it("should calculate 50% score when half answers are correct", async () => {
      // Arrange
      const userAnswers: UserAnswer[] = [
        { questionId: "question-1", answerId: "answer-2" }, // Correct
        { questionId: "question-2", answerId: "answer-4" }, // Incorrect
      ];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.score).toBe(50);
    });

    it("should calculate 0% score when no answers are correct", async () => {
      // Arrange
      const userAnswers: UserAnswer[] = [
        { questionId: "question-1", answerId: "answer-1" }, // Incorrect
        { questionId: "question-2", answerId: "answer-4" }, // Incorrect
      ];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.score).toBe(0);
    });

    it("should round score correctly (e.g., 33.33% to 33%)", async () => {
      // Arrange - Create a quiz with 3 questions
      const threeQuestionQuiz: QuizDetailDTO = {
        ...mockQuiz,
        questions: [
          ...mockQuiz.questions,
          {
            id: "question-3",
            question_text: "What is 3+3?",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            metadata: {},
            answers: [
              {
                id: "answer-6",
                answer_text: "6",
                is_correct: true,
                source: "user",
              },
            ],
          },
        ],
      };
      const userAnswers: UserAnswer[] = [
        { questionId: "question-1", answerId: "answer-2" }, // Correct (1/3)
        { questionId: "question-2", answerId: "answer-4" }, // Incorrect
        { questionId: "question-3", answerId: "answer-6" }, // Correct (but already counted)
      ];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(threeQuestionQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      // 2 correct out of 3 = 66.67% rounded to 67%
      expect(result.current.score).toBe(67);
    });

    it("should return 0 for empty results array", async () => {
      // Arrange
      const emptyQuiz: QuizDetailDTO = {
        ...mockQuiz,
        questions: [],
      };
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify([]));

      // Act
      const { result } = renderHook(() => useQuizResults(emptyQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.score).toBe(0);
    });
  });

  describe("Navigation Handlers", () => {
    it("should clear sessionStorage and redirect to play page on handlePlayAgain", async () => {
      // Arrange
      const userAnswers: UserAnswer[] = [{ questionId: "question-1", answerId: "answer-2" }];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));
      sessionStorage.setItem("quiz-quiz-123-questions", JSON.stringify(mockQuiz.questions));

      const { result } = renderHook(() => useQuizResults(mockQuiz));
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });

      // Act
      result.current.handlePlayAgain();

      // Assert
      expect(sessionStorage.getItem("quiz-quiz-123-answers")).toBeNull();
      expect(sessionStorage.getItem("quiz-quiz-123-questions")).toBeNull();
      expect(mockLocationAssign).toHaveBeenCalledWith("/quizzes/quiz-123/play");
    });

    it("should clear sessionStorage and redirect to dashboard on handleGoToDashboard", async () => {
      // Arrange
      const userAnswers: UserAnswer[] = [{ questionId: "question-1", answerId: "answer-2" }];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));
      sessionStorage.setItem("quiz-quiz-123-questions", JSON.stringify(mockQuiz.questions));

      const { result } = renderHook(() => useQuizResults(mockQuiz));
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });

      // Act
      result.current.handleGoToDashboard();

      // Assert
      expect(sessionStorage.getItem("quiz-quiz-123-answers")).toBeNull();
      expect(sessionStorage.getItem("quiz-quiz-123-questions")).toBeNull();
      expect(mockLocationAssign).toHaveBeenCalledWith("/");
    });

    it("should handle navigation when sessionStorage items do not exist", async () => {
      // Arrange
      const { result } = renderHook(() => useQuizResults(mockQuiz));
      await waitFor(() => {
        expect(result.current.viewState).toBe("error");
      });

      // Act
      result.current.handlePlayAgain();

      // Assert - Should not throw, should still redirect
      expect(mockLocationAssign).toHaveBeenCalledWith("/quizzes/quiz-123/play");
    });
  });

  describe("Error Handling", () => {
    it("should handle Error objects and log with stack trace", async () => {
      // Arrange
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test";
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
      getItemSpy.mockImplementation((key: string) => {
        if (key === "quiz-quiz-123-answers") {
          throw error;
        }
        return null;
      });

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("error");
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Error processing quiz results",
        expect.objectContaining({
          error: expect.objectContaining({
            message: "Test error",
            stack: "Error: Test error\n    at test",
            details: { quizId: "quiz-123" },
          }),
        })
      );

      // Cleanup
      getItemSpy.mockRestore();
    });

    it("should handle non-Error objects and log as string", async () => {
      // Arrange
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
      getItemSpy.mockImplementation((key: string) => {
        if (key === "quiz-quiz-123-answers") {
          throw "String error";
        }
        return null;
      });

      // Act
      const { result } = renderHook(() => useQuizResults(mockQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("error");
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Error processing quiz results",
        expect.objectContaining({
          error: expect.objectContaining({
            message: "String error",
            details: { quizId: "quiz-123" },
          }),
        })
      );

      // Cleanup
      getItemSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle quiz with single question", async () => {
      // Arrange
      const singleQuestionQuiz: QuizDetailDTO = {
        ...mockQuiz,
        questions: [mockQuiz.questions[0]],
      };
      const userAnswers: UserAnswer[] = [{ questionId: "question-1", answerId: "answer-2" }];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(singleQuestionQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.results).toHaveLength(1);
      expect(result.current.score).toBe(100);
    });

    it("should handle question with single answer option", async () => {
      // Arrange
      const singleAnswerQuiz: QuizDetailDTO = {
        ...mockQuiz,
        questions: [
          {
            id: "question-1",
            question_text: "True or False?",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            metadata: {},
            answers: [
              {
                id: "answer-1",
                answer_text: "True",
                is_correct: true,
                source: "user",
              },
            ],
          },
        ],
      };
      const userAnswers: UserAnswer[] = [{ questionId: "question-1", answerId: "answer-1" }];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(singleAnswerQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.results[0].answers).toHaveLength(1);
      expect(result.current.results[0].answers[0].status).toBe("correct");
    });

    it("should handle multiple correct answers in a question", async () => {
      // Arrange
      const multiCorrectQuiz: QuizDetailDTO = {
        ...mockQuiz,
        questions: [
          {
            id: "question-1",
            question_text: "Which are even numbers?",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            metadata: {},
            answers: [
              {
                id: "answer-1",
                answer_text: "2",
                is_correct: true,
                source: "user",
              },
              {
                id: "answer-2",
                answer_text: "4",
                is_correct: true,
                source: "user",
              },
              {
                id: "answer-3",
                answer_text: "3",
                is_correct: false,
                source: "user",
              },
            ],
          },
        ],
      };
      const userAnswers: UserAnswer[] = [
        { questionId: "question-1", answerId: "answer-2" }, // Correct
      ];
      sessionStorage.setItem("quiz-quiz-123-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(multiCorrectQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      const answer1 = result.current.results[0].answers.find((a) => a.id === "answer-1");
      const answer2 = result.current.results[0].answers.find((a) => a.id === "answer-2");
      const answer3 = result.current.results[0].answers.find((a) => a.id === "answer-3");
      expect(answer1?.status).toBe("correct");
      expect(answer2?.status).toBe("correct");
      expect(answer3?.status).toBe("neutral");
      expect(result.current.score).toBe(100);
    });

    it("should handle quiz ID changes and update sessionStorage key accordingly", async () => {
      // Arrange
      const differentQuiz: QuizDetailDTO = {
        ...mockQuiz,
        id: "quiz-456",
      };
      const userAnswers: UserAnswer[] = [
        { questionId: "question-1", answerId: "answer-2" }, // Correct
        { questionId: "question-2", answerId: "answer-5" }, // Correct
      ];
      sessionStorage.setItem("quiz-quiz-456-answers", JSON.stringify(userAnswers));

      // Act
      const { result } = renderHook(() => useQuizResults(differentQuiz));

      // Assert
      await waitFor(() => {
        expect(result.current.viewState).toBe("ready");
      });
      expect(result.current.score).toBe(100);
    });
  });
});
