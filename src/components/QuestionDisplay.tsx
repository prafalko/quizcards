interface QuestionDisplayProps {
  questionText: string;
}

export function QuestionDisplay({ questionText }: QuestionDisplayProps) {
  return (
    <div className="mb-8">
      <p className="text-xl font-medium leading-relaxed text-center">
        {questionText}
      </p>
    </div>
  );
}
