import type { QuizzesListDTO } from "@/types";
import { useDashboard } from "./hooks/useDashboard";
import { QuizGenerationForm } from "./QuizGenerationForm";
import { QuizList } from "./QuizList";
import { ConfirmationDialog } from "./ui/ConfirmationDialog";

interface DashboardProps {
  initialQuizzes: QuizzesListDTO;
}

export function Dashboard({ initialQuizzes }: DashboardProps) {
  const {
    quizzes,
    generationState,
    generationError,
    errorCode,
    errorDetails,
    quizToDelete,
    handleGenerateQuiz,
    handleDeleteRequest,
    handleConfirmDelete,
    handleCancelDelete,
  } = useDashboard(initialQuizzes);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-8">
        {/* Nagłówek */}
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Panel Główny</h1>
          <p className="text-muted-foreground text-lg">
            Wygeneruj nowy quiz lub wybierz istniejący, aby rozpocząć naukę
          </p>
        </header>

        {/* Sekcja generowania quizu */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Utwórz nowy quiz</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Wklej link do publicznego zestawu fiszek z Quizlet, aby wygenerować quiz
            </p>
          </div>
          <QuizGenerationForm
            isGenerating={generationState === "loading"}
            onSubmit={handleGenerateQuiz}
            error={generationError}
            errorCode={errorCode}
            errorDetails={errorDetails}
          />
        </section>

        {/* Separator */}
        <div className="border-t" />

        {/* Sekcja listy quizów */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Twoje quizy</h2>
          <QuizList quizzes={quizzes} onDelete={handleDeleteRequest} />
        </section>
      </div>

      {/* Dialog potwierdzenia usunięcia */}
      <ConfirmationDialog
        isOpen={quizToDelete !== null}
        title="Usuń quiz"
        description={`Czy na pewno chcesz usunąć quiz "${quizToDelete?.title}"? Ta operacja jest nieodwracalna.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
