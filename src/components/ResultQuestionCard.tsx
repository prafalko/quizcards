import { CheckCircle, XCircle, Circle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ResultQuestionViewModel } from "@/types";

interface ResultQuestionCardProps {
  result: ResultQuestionViewModel;
  questionNumber: number;
}

export function ResultQuestionCard({ result, questionNumber }: ResultQuestionCardProps) {
  const getAnswerIcon = (status: "correct" | "user_incorrect" | "neutral") => {
    switch (status) {
      case "correct":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "user_incorrect":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getAnswerStyle = (status: "correct" | "user_incorrect" | "neutral") => {
    switch (status) {
      case "correct":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950";
      case "user_incorrect":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
      default:
        return "border-muted bg-muted/20";
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="font-medium">
          Pytanie {questionNumber}: {result.question_text}
        </h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {result.answers.map((answer) => (
            <div
              key={answer.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${getAnswerStyle(answer.status)}`}
            >
              {getAnswerIcon(answer.status)}
              <span className="flex-1">{answer.answer_text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
