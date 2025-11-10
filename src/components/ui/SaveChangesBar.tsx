import { Button } from "./button";

interface SaveChangesBarProps {
  isVisible: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SaveChangesBar({ isVisible, isSaving, onSave, onDiscard }: SaveChangesBarProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-50">
      <div className="container mx-auto max-w-7xl flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Masz niezapisane zmiany w quizie</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDiscard} disabled={isSaving}>
            Odrzuć zmiany
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </div>
      </div>
    </div>
  );
}
