import type { QuizListItemDTO } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuizCardProps {
  quiz: QuizListItemDTO;
  onDelete: (quizId: string) => void;
}

export function QuizCard({ quiz, onDelete }: QuizCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    onDelete(quiz.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        <CardDescription>
          {quiz.question_count} {quiz.question_count === 1 ? "pytanie" : "pytań"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Status: <span className="capitalize">{quiz.status}</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2 flex-wrap">
        <Button asChild>
          <a href={`/quizzes/${quiz.id}/play`}>Rozwiąż</a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/quizzes/${quiz.id}/edit`}>Edytuj</a>
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          Usuń
        </Button>
      </CardFooter>
    </Card>
  );
}
