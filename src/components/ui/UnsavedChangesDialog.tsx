import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesDialog({
  isOpen,
  onDiscard,
  onSave,
  onCancel,
  isSaving = false,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Masz niezapisane zmiany</AlertDialogTitle>
          <AlertDialogDescription>
            Quiz ma niezapisane zmiany. Czy chcesz je zapisać przed powrotem do listy quizów?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCancel}>Anuluj</AlertDialogCancel>
          <Button variant="outline" onClick={onDiscard}>
            Odrzuć zmiany
          </Button>
          <AlertDialogAction onClick={onSave} disabled={isSaving}>
            {isSaving ? "Zapisywanie..." : "Zapisz"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
