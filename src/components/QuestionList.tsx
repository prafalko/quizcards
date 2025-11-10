import { QuestionEditForm } from "./QuestionEditForm";
import type { QuestionDetailDTO } from "@/types";

interface QuestionListProps {
  questions: QuestionDetailDTO[];
  onQuestionChange: (questionId: string, newText: string) => void;
  onAnswerChange: (questionId: string, answerId: string, newText: string) => void;
  onDeleteRequest: (questionId: string) => void;
  onRegenerate: (questionId: string) => void;
  regeneratingQuestionId: string | null;
}

export function QuestionList({
  questions,
  onQuestionChange,
  onAnswerChange,
  onDeleteRequest,
  onRegenerate,
  regeneratingQuestionId,
}: QuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">Ten quiz nie zawiera jeszcze żadnych pytań.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((question, index) => (
        <div key={question.id} className="space-y-2">
          <h3 className="text-lg font-semibold text-muted-foreground">Pytanie {index + 1}</h3>
          <QuestionEditForm
            question={question}
            onQuestionChange={onQuestionChange}
            onAnswerChange={onAnswerChange}
            onDeleteRequest={onDeleteRequest}
            onRegenerate={onRegenerate}
            isRegenerating={regeneratingQuestionId === question.id}
          />
        </div>
      ))}
    </div>
  );
}
