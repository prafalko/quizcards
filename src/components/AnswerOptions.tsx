import { Button } from "@/components/ui/button";
import type { QuizAnswerViewModel } from "@/types";

interface AnswerOptionsProps {
  answers: QuizAnswerViewModel[];
  onSelect: (answerId: string) => void;
}

export function AnswerOptions({ answers, onSelect }: AnswerOptionsProps) {
  return (
    <div className="grid gap-4 max-w-2xl mx-auto">
      {answers.map((answer) => (
        <Button
          key={answer.id}
          variant="outline"
          size="lg"
          className="h-auto p-6 text-left justify-start whitespace-normal"
          onClick={() => onSelect(answer.id)}
        >
          <span className="text-base leading-relaxed">
            {answer.answer_text}
          </span>
        </Button>
      ))}
    </div>
  );
}
