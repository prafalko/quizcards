import { Progress } from "@/components/ui/progress";
import { QuestionDisplay } from "./QuestionDisplay";
import { AnswerOptions } from "./AnswerOptions";
import { useQuizPlay } from "./hooks/useQuizPlay";
import type { QuizDetailDTO } from "@/types";

interface QuizPlayViewProps {
  initialQuiz: QuizDetailDTO;
}

export function QuizPlayView({ initialQuiz }: QuizPlayViewProps) {
  const { quizPhase, shuffledQuestions, currentQuestionIndex, handleAnswerSelect } = useQuizPlay(initialQuiz);

  // Loading state
  if (quizPhase === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Przygotowywanie quizu...</p>
        </div>
      </div>
    );
  }

  // Finished state (will redirect, but show loading just in case)
  if (quizPhase === "finished") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Przekierowywanie do wyników...</p>
        </div>
      </div>
    );
  }

  // Check if quiz has questions
  if (shuffledQuestions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-destructive text-lg mb-2">Ten quiz nie zawiera żadnych pytań</p>
          <p className="text-muted-foreground text-sm">
            <a href="/" className="underline hover:no-underline">
              Wróć do panelu głównego
            </a>
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const progressValue = ((currentQuestionIndex + 1) / shuffledQuestions.length) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Pytanie {currentQuestionIndex + 1} z {shuffledQuestions.length}
            </span>
            <span>{Math.round(progressValue)}% ukończone</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Question display */}
        <QuestionDisplay questionText={currentQuestion.question_text} />

        {/* Answer options */}
        <AnswerOptions answers={currentQuestion.answers} onSelect={handleAnswerSelect} />
      </div>
    </div>
  );
}
