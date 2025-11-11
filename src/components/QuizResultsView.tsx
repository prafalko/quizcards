import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { QuizDetailDTO } from "@/types";
import { useQuizResults } from "@/components/hooks/useQuizResults";
import { ScoreSummary } from "@/components/ScoreSummary";
import { ResultsList } from "@/components/ResultsList";

interface QuizResultsViewProps {
  initialQuiz: QuizDetailDTO;
}

export function QuizResultsView({ initialQuiz }: QuizResultsViewProps) {
  const { viewState, score, results, handlePlayAgain, handleGoToDashboard } = useQuizResults(initialQuiz);

  if (viewState === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-lg">Ładowanie wyników...</div>
        </div>
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Błąd ładowania wyników</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Nie można wczytać wyników. Sesja wygasła lub nie została znaleziona.
            </p>
            <Button onClick={handleGoToDashboard}>Powróć do listy quizów</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{initialQuiz.title}</h1>
        <p className="text-muted-foreground">Podsumowanie wyników</p>
      </div>

      {score !== null && <ScoreSummary score={score} />}

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-6">Szczegółowe wyniki</h2>
        <ResultsList results={results} />
      </div>

      <div className="flex gap-4 justify-center mt-8">
        <Button onClick={handlePlayAgain} variant="outline">
          Rozwiąż ponownie
        </Button>
        <Button onClick={handleGoToDashboard}>Powróć do listy quizów</Button>
      </div>
    </div>
  );
}
