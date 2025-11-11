# Przewodnik Implementacji Usługi Google Gemini

## 1. Opis usługi

Usługa `GeminiService` będzie stanowić centralny punkt integracji z API Google Gemini w aplikacji QuizCards. Jej głównym zadaniem jest abstrakcja logiki komunikacji z API, zarządzanie tworzeniem zapytań (promptów), walidacja odpowiedzi oraz obsługa błędów. Usługa zostanie zaprojektowana w sposób modułowy, aby ułatwić testowanie, konserwację i przyszłą rozbudowę.

Główne cele usługi:
- **Enkapsulacja logiki:** Ukrycie złożoności interakcji z `@google/generative-ai` SDK.
- **Generowanie treści:** Dostarczenie metod do generowania ustrukturyzowanych danych, takich jak quizy, na podstawie zapytań w języku naturalnym.
- **Walidacja i bezpieczeństwo typów:** Zapewnienie, że dane zwracane przez usługę są zgodne z typami używanymi w aplikacji (np. schematami Zod).
- **Obsługa błędów:** Implementacja solidnych mechanizmów obsługi błędów API i walidacji.

## 2. Opis konstruktora

Konstruktor `GeminiService` będzie inicjalizował klienta Gemini API. Klucz API będzie pobierany ze zmiennych środowiskowych po stronie serwera, zgodnie z najlepszymi praktykami bezpieczeństwa.

```typescript:src/lib/services/ai.service.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private readonly modelName: string = "gemini-2.5-flash"; // Domyślny model

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not provided.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // ... metody
}

// Singleton instance
const geminiApiKey = import.meta.env.GEMINI_API_KEY;
export const geminiService = new GeminiService(geminiApiKey);
```

## 3. Publiczne metody i pola

### `generateStructuredData<T extends z.ZodTypeAny>(systemPrompt: string, userPrompt: string, schema: T): Promise<z.infer<T>>`

Jest to generyczna metoda publiczna, która będzie głównym interfejsem usługi.

- **Cel:** Generowanie ustrukturyzowanych danych w formacie JSON na podstawie podanego schematu Zod.
- **Parametry:**
    - `systemPrompt` (string): Instrukcja dla modelu, która definiuje jego rolę i ogólne zasady.
    - `userPrompt` (string): Konkretne polecenie od użytkownika.
    - `schema` (T extends z.ZodTypeAny): Schemat Zod definiujący oczekiwaną strukturę odpowiedzi.
- **Zwraca:** `Promise<z.infer<T>>` - Obiekt zgodny ze zdefiniowanym schematem.
- **Rzuca błędy:** W przypadku problemów z API, walidacją lub filtrami bezpieczeństwa, metoda będzie rzucać customowe błędy (patrz sekcja 5. Obsługa błędów).

## 4. Prywatne metody i pola

### `private getModel(generationConfig: object)`

- **Cel:** Inicjalizacja i zwrócenie instancji modelu generatywnego z odpowiednią konfiguracją.
- **Parametry:**
    - `generationConfig` (object): Obiekt konfiguracyjny dla modelu (temperatura, `maxOutputTokens`, `responseMimeType` itp.).
- **Zwraca:** Instancję `GenerativeModel`.

### `private buildPrompt(systemPrompt: string, userPrompt: string, schema: z.ZodTypeAny): string`

- **Cel:** Zbudowanie pełnego, sformatowanego promptu, który zawiera instrukcję systemową, zapytanie użytkownika oraz opis oczekiwanego schematu JSON.
- **Parametry:**
    - `systemPrompt` (string): Instrukcja systemowa.
    - `userPrompt` (string): Zapytanie użytkownika.
    - `schema` (z.ZodTypeAny): Schemat Zod do konwersji na schemat JSON i dołączenia do promptu.
- **Zwraca:** Pełny prompt w formie stringa.

### `private validateAndParseResponse<T extends z.ZodTypeAny>(response: string, schema: T): z.infer<T>`

- **Cel:** Parsowanie odpowiedzi tekstowej z API (która powinna być JSON-em) i walidacja jej względem podanego schematu Zod.
- **Parametry:**
    - `response` (string): Surowa odpowiedź tekstowa z modelu Gemini.
    - `schema` (T extends z.ZodTypeAny): Schemat Zod do walidacji.
- **Zwraca:** Sparsowany i zwalidowany obiekt.
- **Rzuca błędy:** `InvalidResponseDataError`, jeśli odpowiedź nie jest poprawnym JSON-em lub nie jest zgodna ze schematem.

## 5. Obsługa błędów

Usługa będzie implementować hierarchię customowych błędów, aby ułatwić ich obsługę w wyższych warstwach aplikacji. Wszystkie błędy będą dziedziczyć po `BaseError`.

```typescript:src/lib/errors.ts
export class BaseError extends Error {
  // ... implementacja
}
export class ApiKeyError extends BaseError {}
export class ApiGenerationError extends BaseError {}
export class InvalidResponseDataError extends BaseError {}
export class ContentBlockedError extends BaseError {}
```

**Scenariusze błędów:**

1.  **Brak klucza API:** Konstruktor rzuci `ApiKeyError`.
2.  **Błąd generowania (API):** Jeśli wywołanie API zakończy się niepowodzeniem (błąd sieci, serwera 5xx), zostanie rzucony `ApiGenerationError`.
3.  **Zablokowana treść:** Jeśli odpowiedź zostanie zablokowana przez filtry bezpieczeństwa Gemini, zostanie rzucony `ContentBlockedError`.
4.  **Nieprawidłowa odpowiedź:** Jeśli model zwróci dane niezgodne ze schematem, zostanie rzucony `InvalidResponseDataError`. Błąd ten powinien zawierać oryginalną, nieprawidłową odpowiedź w celu ułatwienia debugowania.

## 6. Kwestie bezpieczeństwa

1.  **Zarządzanie kluczem API:** Klucz `GEMINI_API_KEY` musi być przechowywany wyłącznie jako zmienna środowiskowa (`.env`) na serwerze i nigdy nie może być ujawniony po stronie klienta. Dostęp do niego w Astro odbywa się przez `import.meta.env.GEMINI_API_KEY`.
2.  **Walidacja wejścia:** Wszystkie dane wejściowe od użytkownika (np. temat quizu) muszą być walidowane na poziomie endpointu API (np. za pomocą Zod), aby zapobiec atakom typu prompt injection.
3.  **Walidacja wyjścia:** Każda odpowiedź z Gemini musi być rygorystycznie walidowana względem schematu Zod, aby upewnić się, że do aplikacji nie trafią nieoczekiwane lub złośliwe dane.
4.  **Logowanie:** Należy unikać logowania pełnych danych użytkownika lub wrażliwych informacji. Logi powinny zawierać informacje istotne dla debugowania (np. ID błędu, typ błędu), ale nie dane osobowe.

## 7. Plan wdrożenia krok po kroku

### Krok 1: Konfiguracja środowiska

1.  Dodaj `GEMINI_API_KEY` do pliku `.env` w głównym katalogu projektu.
    ```env
    GEMINI_API_KEY="TWOJ_KLUCZ_API_GEMINI"
    ```
2.  Zainstaluj wymagane pakiety:
    ```bash
    npm install @google/generative-ai zod zod-to-json-schema
    ```
3.  Zaktualizuj `src/env.d.ts` o nową zmienną środowiskową.

### Krok 2: Utworzenie hierarchii błędów

1.  W pliku `src/lib/errors.ts`, zdefiniuj customowe klasy błędów, jak opisano w sekcji 5.

### Krok 3: Implementacja `GeminiService`

1.  Utwórz nowy plik `src/lib/services/ai.service.ts`.
2.  Zaimplementuj klasę `GeminiService` zgodnie ze strukturą opisaną w sekcjach 2, 3 i 4.

**Implementacja `buildPrompt`:**

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";
// ... wewnątrz klasy GeminiService

private buildPrompt(systemPrompt: string, userPrompt: string, schema: z.ZodTypeAny): string {
  const jsonSchema = zodToJsonSchema(schema, "responseSchema");

  return `${systemPrompt}

  Zawsze odpowiadaj w formacie JSON. Użyj następującego schematu JSON:
  ${JSON.stringify(jsonSchema, null, 2)}
  
  ---
  
  Zapytanie użytkownika:
  ${userPrompt}`;
}
```

**Implementacja `generateStructuredData`:**

```typescript
// ... wewnątrz klasy GeminiService

async generateStructuredData<T extends z.ZodTypeAny>(
  systemPrompt: string, 
  userPrompt: string, 
  schema: T
): Promise<z.infer<T>> {
  
  const generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };

  const model = this.genAI.getGenerativeModel({
    model: this.modelName,
    generationConfig,
  });

  const prompt = this.buildPrompt(systemPrompt, userPrompt, schema);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;

    if (!response.text) {
        // Obsługa blokady treści lub pustej odpowiedzi
        const safetyRatings = response.promptFeedback?.safetyRatings;
        throw new ContentBlockedError(
          `Content blocked due to safety ratings: ${JSON.stringify(safetyRatings)}`
        );
    }
    
    const text = response.text();
    return this.validateAndParseResponse(text, schema);

  } catch (error) {
    if (error instanceof BaseError) throw error;
    // Logowanie oryginalnego błędu
    console.error("Gemini API generation error:", error);
    throw new ApiGenerationError("Failed to generate content from Gemini API.");
  }
}

private validateAndParseResponse<T extends z.ZodTypeAny>(
  response: string,
  schema: T
): z.infer<T> {
  try {
    const data = JSON.parse(response);
    const validationResult = schema.safeParse(data);
    if (!validationResult.success) {
      throw new InvalidResponseDataError(
        `Response validation failed: ${validationResult.error.message}`,
        { originalResponse: response }
      );
    }
    return validationResult.data;
  } catch (error) {
    if (error instanceof InvalidResponseDataError) throw error;
    throw new InvalidResponseDataError(
      `Failed to parse JSON response: ${error.message}`,
      { originalResponse: response }
    );
  }
}
```

### Krok 4: Integracja z endpointem API Astro

1.  Zmodyfikuj istniejący lub utwórz nowy endpoint API w Astro, np. `src/pages/api/quizzes/generate.ts`.
2.  Zaimportuj singleton `geminiService`.
3.  Zdefiniuj schemat Zod dla oczekiwanej odpowiedzi (np. schemat quizu).
4.  Zdefiniuj prompt systemowy i użytkownika.
5.  Wywołaj `geminiService.generateStructuredData` wewnątrz bloku `try...catch` i obsłuż potencjalne błędy, zwracając odpowiednie statusy HTTP.

**Przykład endpointu `generate.ts`:**

```typescript:src/pages/api/quizzes/generate.ts
import type { APIRoute } from "astro";
import { z } from "zod";
import { geminiService } from "@/lib/services/ai.service";
import { BaseError } from "@/lib/errors";
import { QuizDBSchema } from "@/types"; // Przykładowy schemat Zod dla quizu

export const POST: APIRoute = async ({ request }) => {
  // 1. Walidacja wejścia
  const body = await request.json();
  const inputSchema = z.object({ topic: z.string().min(3) });
  const parseResult = inputSchema.safeParse(body);

  if (!parseResult.success) {
    return new Response(JSON.stringify(parseResult.error), { status: 400 });
  }

  const { topic } = parseResult.data;

  // 2. Definicja promptu
  const systemPrompt = "Jesteś asystentem, który tworzy quizy na podany temat. Quiz powinien zawierać 5 pytań z 4 odpowiedziami.";
  const userPrompt = `Temat quizu: ${topic}`;

  // 3. Wywołanie usługi Gemini
  try {
    const quizData = await geminiService.generateStructuredData(
      systemPrompt,
      userPrompt,
      QuizDBSchema // Użyj schematu Zod, który definiuje strukturę quizu
    );
    return new Response(JSON.stringify(quizData), { status: 200 });

  } catch (error) {
    if (error instanceof BaseError) {
      // Logowanie szczegółów błędu na serwerze
      console.error(`GeminiService Error: ${error.name}`, error.message);
      return new Response(JSON.stringify({ message: error.message }), { status: 500 });
    }
    // Nieznany błąd
    console.error("Unknown error during quiz generation:", error);
    return new Response("An unexpected error occurred.", { status: 500 });
  }
};
```
