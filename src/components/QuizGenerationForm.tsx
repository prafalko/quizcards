import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validateGenerateQuizCommand } from "@/lib/validators/quiz.validator";

interface QuizGenerationFormProps {
  isGenerating: boolean;
  onSubmit: (url: string) => void;
  error: string | null;
}

export function QuizGenerationForm({ isGenerating, onSubmit, error }: QuizGenerationFormProps) {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Walidacja: pole nie może być puste
    if (!url.trim()) {
      setValidationError("Pole URL nie może być puste");
      return;
    }

    // Walidacja z użyciem istniejącego validatora
    const validationResult = validateGenerateQuizCommand.safeParse({ source_url: url });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      const errorMessages: Record<string, string> = {
        "Invalid URL format": "Podaj poprawny adres URL",
        "URL must be from quizlet.com": "Podaj link do zestawu z Quizlet",
        "Invalid Quizlet set URL format":
          "Niepoprawny format linku do zestawu Quizlet. Użyj linku w formacie: https://quizlet.com/{id}/{nazwa-zestawu}",
      };

      setValidationError(errorMessages[firstError.message] || firstError.message);
      return;
    }

    onSubmit(url);
  };

  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="https://quizlet.com/..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setValidationError(null);
            }}
            disabled={isGenerating}
            aria-label="URL zestawu Quizlet"
            aria-invalid={!!displayError}
          />
        </div>
        <Button type="submit" disabled={isGenerating || !url.trim()}>
          {isGenerating ? "Generowanie..." : "Generuj"}
        </Button>
      </div>
      {displayError && (
        <div className="text-sm text-destructive" role="alert">
          {displayError}
        </div>
      )}
    </form>
  );
}
