import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { validateGenerateQuizCommand } from "@/lib/validators/quiz.validator";
import type { ErrorResponse } from "@/types";

interface QuizGenerationFormProps {
  isGenerating: boolean;
  onSubmit: (url: string, jsonData?: unknown) => void;
  error: string | null;
  errorCode?: string | null;
  errorDetails?: ErrorResponse["error"]["details"];
}

export function QuizGenerationForm({
  isGenerating,
  onSubmit,
  error,
  errorCode,
  errorDetails,
}: QuizGenerationFormProps) {
  const [url, setUrl] = useState("");
  const [jsonData, setJsonData] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Zachowaj stan błędu scrapera nawet podczas generowania
  const [savedScraperFailed, setSavedScraperFailed] = useState(false);
  const [savedApiUrl, setSavedApiUrl] = useState<string | undefined>(undefined);

  // Aktualizuj zapisane wartości gdy pojawi się błąd scrapera
  useEffect(() => {
    if (errorCode === "QUIZLET_SCRAPER_FAILED") {
      setSavedScraperFailed(true);
      const apiUrlValue = errorDetails?.apiUrl as string | undefined;
      if (apiUrlValue) {
        setSavedApiUrl(apiUrlValue);
      }
    }
  }, [errorCode, errorDetails]);

  // Check if error is scraper failed error (używaj zapisanych wartości jeśli są dostępne)
  const isScraperFailed = savedScraperFailed || errorCode === "QUIZLET_SCRAPER_FAILED";
  const apiUrl = savedApiUrl || (errorDetails?.apiUrl as string | undefined);

  const handleCopyUrl = async () => {
    if (apiUrl) {
      await navigator.clipboard.writeText(apiUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleOpenUrl = () => {
    if (apiUrl) {
      window.open(apiUrl, "_blank");
    }
  };

  const validateUrl = (): boolean => {
    setValidationError(null);

    // Walidacja: pole nie może być puste
    if (!url.trim()) {
      setValidationError("Pole URL nie może być puste");
      return false;
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
      return false;
    }

    return true;
  };

  const handleSubmitFromUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setJsonParseError(null);

    if (!validateUrl()) {
      return;
    }

    // Zawsze generuj tylko z linku (bez JSON)
    onSubmit(url);
  };

  const handleSubmitFromJson = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setJsonParseError(null);

    if (!validateUrl()) {
      return;
    }

    // Walidacja JSON
    if (!jsonData.trim()) {
      setJsonParseError("Wklej zawartość JSON z otwartej strony");
      return;
    }

    try {
      const parsedJson = JSON.parse(jsonData);
      onSubmit(url, parsedJson);
    } catch {
      setJsonParseError("Niepoprawny format JSON. Sprawdź czy wklejony tekst jest poprawnym JSON.");
    }
  };

  const displayError = validationError || jsonParseError || (isScraperFailed ? null : error);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmitFromUrl} className="space-y-4">
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
            {isGenerating ? "Generowanie..." : isScraperFailed ? "Generuj z linku" : "Generuj"}
          </Button>
        </div>
      </form>

      {/* Fallback UI when scraper fails */}
      {isScraperFailed && apiUrl && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-destructive">Automatyczne pobieranie nie powiodło się</h3>
            <p className="text-sm text-muted-foreground">Możesz ręcznie pobrać dane z Quizlet i wkleić je poniżej:</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="api-url" className="text-sm font-medium">
              Krok 1: Otwórz ten link w przeglądarce
            </label>
            <div className="flex gap-2 items-stretch">
              <Input
                id="api-url"
                type="text"
                value={apiUrl}
                readOnly
                className="font-mono text-xs h-9"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleCopyUrl}
                title="Skopiuj link"
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleOpenUrl}
                title="Otwórz w nowej karcie"
              >
                Otwórz
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="quizlet-json" className="text-sm font-medium">
              Krok 2: Wklej zawartość JSON z otwartej strony
            </label>
            <p className="text-xs text-muted-foreground">
              Po otwarciu linku powyżej, skopiuj całą zawartość strony (powinna być w formacie JSON) i wklej ją tutaj.
              Najłatwiej: naciśnij na stronie klawisze Ctrl i A jednocześnie, potem Ctrl i C, żeby skopiować, a
              następnie wklej przez Ctrl + V wszystko do pola poniżej. Jeśli korzystasz z telefonu, przytrzymaj palec na
              stronie, wybierz "Zaznacz wszystko", potem "Kopiuj" i wklej tutaj.
            </p>
            <Textarea
              id="quizlet-json"
              placeholder="Wklej tutaj zawartość JSON z otwartej strony..."
              value={jsonData}
              onChange={(e) => {
                setJsonData(e.target.value);
                setJsonParseError(null);
              }}
              disabled={isGenerating}
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          <form onSubmit={handleSubmitFromJson}>
            <Button type="submit" disabled={isGenerating || !url.trim() || !jsonData.trim()}>
              {isGenerating ? "Generowanie..." : "Generuj z JSON"}
            </Button>
          </form>
        </div>
      )}

      {displayError && (
        <div className="text-sm text-destructive" role="alert">
          {displayError}
        </div>
      )}
    </div>
  );
}
