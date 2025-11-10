import type { QuizDetailDTO } from "@/types";
import { useQuizEdit } from "./hooks/useQuizEdit";
import { SaveChangesBar } from "./ui/SaveChangesBar";
import { EditableTitle } from "./EditableTitle";
import { QuestionList } from "./QuestionList";
import { ConfirmationDialog } from "./ui/ConfirmationDialog";
import { UnsavedChangesDialog } from "./ui/UnsavedChangesDialog";
import { Button } from "./ui/button";
import { useState } from "react";

interface QuizEditViewProps {
  initialQuiz: QuizDetailDTO;
}

export function QuizEditView({ initialQuiz }: QuizEditViewProps) {
  const [showReturnModal, setShowReturnModal] = useState(false);

  const {
    quiz,
    isDirty,
    isSaving,
    isRegenerating,
    questionToDeleteId,
    saveError,
    deleteError,
    regenerateError,
    handleSaveChanges,
    handleDiscardChanges,
    updateTitle,
    updateQuestion,
    updateAnswer,
    handleDeleteQuestionRequest,
    handleConfirmDeleteQuestion,
    handleCancelDeleteQuestion,
    handleRegenerateAnswers,
  } = useQuizEdit(initialQuiz);

  const handleReturnClick = () => {
    if (isDirty) {
      setShowReturnModal(true);
    } else {
      window.location.href = "/";
    }
  };

  const handleReturnConfirm = async () => {
    await handleSaveChanges();
    window.location.href = "/";
  };

  const handleReturnDiscard = () => {
    handleDiscardChanges();
    window.location.href = "/";
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-24">
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Edycja Quizu</h1>
            <p className="text-muted-foreground text-lg">Edytuj tytuł i pytania quizu</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReturnClick}>
              Powróć do listy quizów
            </Button>
          </div>
        </header>

        {/* Editable Title */}
        <EditableTitle initialTitle={quiz.title} onChange={updateTitle} />

        {/* Error Messages */}
        {(saveError || deleteError || regenerateError) && (
          <div className="space-y-2">
            {saveError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                <p className="text-sm font-medium">Błąd zapisywania: {saveError}</p>
              </div>
            )}
            {deleteError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                <p className="text-sm font-medium">Błąd usuwania: {deleteError}</p>
              </div>
            )}
            {regenerateError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                <p className="text-sm font-medium">Błąd generowania odpowiedzi: {regenerateError}</p>
              </div>
            )}
          </div>
        )}

        {/* Questions List */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Pytania quizu</h2>
          <QuestionList
            questions={quiz.questions}
            onQuestionChange={updateQuestion}
            onAnswerChange={updateAnswer}
            onDeleteRequest={handleDeleteQuestionRequest}
            onRegenerate={handleRegenerateAnswers}
            regeneratingQuestionId={isRegenerating}
          />
        </section>
      </div>

      {/* Save Changes Bar */}
      <SaveChangesBar
        isVisible={isDirty}
        isSaving={isSaving}
        onSave={handleSaveChanges}
        onDiscard={handleDiscardChanges}
      />

      {/* Confirmation Dialog for Question Deletion */}
      <ConfirmationDialog
        isOpen={questionToDeleteId !== null}
        title="Usuń pytanie"
        description="Czy na pewno chcesz usunąć to pytanie? Ta operacja jest nieodwracalna."
        onConfirm={handleConfirmDeleteQuestion}
        onCancel={handleCancelDeleteQuestion}
      />

      {/* Unsaved Changes Dialog for Return to List */}
      <UnsavedChangesDialog
        isOpen={showReturnModal}
        onDiscard={handleReturnDiscard}
        onSave={handleReturnConfirm}
        onCancel={() => setShowReturnModal(false)}
        isSaving={isSaving}
      />
    </div>
  );
}
