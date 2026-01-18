import type { QuizzesListDTO } from "@/types";
import { QuizCard } from "./QuizCard";

interface QuizListProps {
  quizzes: QuizzesListDTO;
  onDelete: (quizId: string) => void;
}

export function QuizList({ quizzes, onDelete }: QuizListProps) {
  if (quizzes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg mb-2">Nie masz jeszcze żadnych quizów.</p>
        <p className="text-muted-foreground text-sm">
          Wklej link do publicznego zestawu fiszek z Quizlet powyżej, aby utworzyć swój pierwszy quiz!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="quiz-list">
      {quizzes.map((quiz) => (
        <QuizCard key={quiz.id} quiz={quiz} onDelete={onDelete} />
      ))}
    </div>
  );
}
