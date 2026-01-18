import { useState, useEffect } from "react";
import type { QuizDetailDTO, ResultQuestionViewModel, ResultAnswerViewModel, UserAnswer } from "../../types";
import { logger } from "../../lib/services/logger.service";

type ViewState = "loading" | "ready" | "error";

export function useQuizResults(initialQuiz: QuizDetailDTO) {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [score, setScore] = useState<number | null>(null);
  const [results, setResults] = useState<ResultQuestionViewModel[]>([]);

  useEffect(() => {
    try {
      // Pobierz odpowiedzi użytkownika z sessionStorage
      const { answersKey } = getQuizStorageKeys(initialQuiz.id);
      const answersData = sessionStorage.getItem(answersKey);

      if (!answersData) {
        setViewState("error");
        return;
      }

      const userAnswers: UserAnswer[] = JSON.parse(answersData);

      // Oblicz wynik i przygotuj dane wyników
      const processedResults = processResults(initialQuiz, userAnswers);
      const calculatedScore = calculateScore(processedResults);

      setResults(processedResults);
      setScore(calculatedScore);
      setViewState("ready");
    } catch (error) {
      logger.error("Error processing quiz results", {
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          details: { quizId: initialQuiz.id },
        },
      });
      setViewState("error");
    }
  }, [initialQuiz]);

  const processResults = (quiz: QuizDetailDTO, userAnswers: UserAnswer[]): ResultQuestionViewModel[] => {
    return quiz.questions.map((question) => {
      const userAnswer = userAnswers.find((ua) => ua.questionId === question.id);

      const processedAnswers: ResultAnswerViewModel[] = question.answers.map((answer) => {
        let status: "correct" | "user_incorrect" | "neutral" = "neutral";

        if (answer.is_correct) {
          status = "correct";
        } else if (userAnswer && userAnswer.answerId === answer.id) {
          status = "user_incorrect";
        }

        return {
          ...answer,
          status,
        };
      });

      return {
        ...question,
        userAnswerId: userAnswer?.answerId || null,
        answers: processedAnswers,
      };
    });
  };

  const calculateScore = (results: ResultQuestionViewModel[]): number => {
    if (results.length === 0) return 0;

    const correctAnswers = results.filter(
      (result) => result.userAnswerId && result.answers.find((a) => a.id === result.userAnswerId)?.is_correct
    ).length;

    return Math.round((correctAnswers / results.length) * 100);
  };

  const clearQuizSession = () => {
    const { answersKey, questionsKey } = getQuizStorageKeys(initialQuiz.id);
    sessionStorage.removeItem(answersKey);
    sessionStorage.removeItem(questionsKey);
  };

  const handlePlayAgain = () => {
    clearQuizSession();
    window.location.assign(`/quizzes/${initialQuiz.id}/play`);
  };

  const handleGoToDashboard = () => {
    clearQuizSession();
    window.location.assign("/");
  };

  return {
    viewState,
    score,
    results,
    handlePlayAgain,
    handleGoToDashboard,
  };
}

const getQuizStorageKeys = (quizId: string) => ({
  answersKey: `quiz-${quizId}-answers`,
  questionsKey: `quiz-${quizId}-questions`,
});
