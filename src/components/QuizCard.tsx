import type { QuizListItemDTO } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    <Card data-testid="quiz-card">
      <CardHeader>
        <CardTitle data-testid="quiz-card-title">{quiz.title}</CardTitle>
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
        {quiz.question_count === 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button disabled data-testid="quiz-card-play-button">
                  <span>Rozwiąż</span>
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ten quiz nie zawiera jeszcze żadnych pytań</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button asChild data-testid="quiz-card-play-button">
            <a href={`/quizzes/${quiz.id}/play`}>Rozwiąż</a>
          </Button>
        )}
        <Button variant="outline" asChild data-testid="quiz-card-edit-button">
          <a href={`/quizzes/${quiz.id}/edit`}>Edytuj</a>
        </Button>
        <Button variant="destructive" onClick={handleDelete} data-testid="quiz-card-delete-button">
          Usuń
        </Button>
      </CardFooter>
    </Card>
  );
}
