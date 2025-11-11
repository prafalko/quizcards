import type { ResultQuestionViewModel } from "@/types";
import { ResultQuestionCard } from "@/components/ResultQuestionCard";

interface ResultsListProps {
  results: ResultQuestionViewModel[];
}

export function ResultsList({ results }: ResultsListProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Ten quiz nie zawiera żadnych pytań.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <ResultQuestionCard key={result.id} result={result} questionNumber={index + 1} />
      ))}
    </div>
  );
}
