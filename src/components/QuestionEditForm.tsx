import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import type { QuestionDetailDTO } from "@/types";

interface QuestionEditFormProps {
  question: QuestionDetailDTO;
  onQuestionChange: (questionId: string, newText: string) => void;
  onAnswerChange: (questionId: string, answerId: string, newText: string) => void;
  onDeleteRequest: (questionId: string) => void;
  onRegenerate: (questionId: string) => void;
  isRegenerating: boolean;
}

export function QuestionEditForm({
  question,
  onQuestionChange,
  onAnswerChange,
  onDeleteRequest,
  onRegenerate,
  isRegenerating,
}: QuestionEditFormProps) {
  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.trim() === "") {
      alert("Treść pytania nie może być pusta");
      return;
    }
    onQuestionChange(question.id, newValue);
  };

  const handleAnswerChange = (answerId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.trim() === "") {
      alert("Treść odpowiedzi nie może być pusta");
      return;
    }
    onAnswerChange(question.id, answerId, newValue);
  };

  const handleDeleteClick = () => {
    onDeleteRequest(question.id);
  };

  const handleRegenerateClick = () => {
    onRegenerate(question.id);
  };

  // Sort answers so the correct one is first
  const sortedAnswers = [...question.answers].sort((a, b) => {
    if (a.is_correct && !b.is_correct) return -1;
    if (!a.is_correct && b.is_correct) return 1;
    return 0;
  });

  // Check if there's at least one correct answer
  const hasCorrectAnswer = question.answers.some((answer) => answer.is_correct);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Textarea
              value={question.question_text}
              onChange={handleQuestionChange}
              placeholder="Wprowadź treść pytania..."
              className="min-h-[80px] resize-none"
            />
          </div>
          <div className="flex flex-row sm:flex-col gap-2 sm:w-auto">
            <Button
              size="sm"
              onClick={handleRegenerateClick}
              disabled={!hasCorrectAnswer || isRegenerating}
              title={
                isRegenerating
                  ? "Generowanie odpowiedzi w trakcie..."
                  : !hasCorrectAnswer
                    ? "Najpierw podaj poprawną odpowiedź"
                    : "Wygeneruj ponownie błędne odpowiedzi"
              }
              className="shrink-0"
            >
              {isRegenerating ? "Generowanie..." : "Generuj ponownie"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              title="Usuń pytanie wraz z odpowiedziami z quizu"
              className="shrink-0"
              disabled={isRegenerating}
            >
              Usuń pytanie
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAnswers.map((answer, index) => (
          <div key={answer.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="sm:min-w-fit sm:flex-shrink-0">
              {index === 0 && (
                <span className="text-sm font-medium text-green-700 dark:text-green-400 whitespace-nowrap">
                  ✓ Poprawna odpowiedź
                </span>
              )}
              {index > 0 && (
                <span className="text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                  Odpowiedź {index + 1}
                </span>
              )}
            </div>
            <Input
              value={answer.answer_text}
              onChange={handleAnswerChange(answer.id)}
              placeholder={`Wprowadź odpowiedź ${index + 1}...`}
              className={
                index === 0
                  ? "border-green-300 dark:border-green-700 focus:border-green-500"
                  : "border-red-300 dark:border-red-700 focus:border-red-500"
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
