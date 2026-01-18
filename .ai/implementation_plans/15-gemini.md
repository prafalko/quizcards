# Przewodnik Implementacji Usługi Google Gemini

## 1. Opis usługi

Usługa `GeminiService` będzie stanowić centralny punkt integracji z API Google Gemini w aplikacji QuizCards. Jej głównym zadaniem jest abstrakcja logiki komunikacji z API, zarządzanie tworzeniem zapytań (promptów), walidacja odpowiedzi oraz obsługa błędów. Usługa zostanie zaprojektowana w sposób modułowy, aby ułatwić testowanie, konserwację i przyszłą rozbudowę.

Główne cele usługi:

- **Enkapsulacja logiki:** Ukrycie złożoności interakcji z `@google/generative-ai` SDK.
- **Generowanie treści:** Dostarczenie metod do generowania ustrukturyzowanych danych, takich jak quizy, na podstawie zapytań w języku naturalnym.
- **Przetwarzanie wsadowe:** Optymalizacja zapytań do AI poprzez grupowanie wielu fiszek w jedno zapytanie, co znacząco redukuje koszty i zapobiega błędom `429 Too Many Requests`.
- **Walidacja i bezpieczeństwo typów:** Zapewnienie, że dane zwracane przez usługę są zgodne z typami używanymi w aplikacji (np. schematami Zod).
- **Obsługa błędów:** Implementacja solidnych mechanizmów obsługi błędów API i walidacji.

## 2. Architektura Usługi

Usługa zostanie podzielona na dwie warstwy:

1.  **`GeminiService` (klasa):** Niskopoziomowa, generyczna klasa opakowująca SDK Gemini. Jej głównym zadaniem jest wykonanie zapytania i zwalidowanie odpowiedzi względem dowolnego schematu Zod. Jest reużywalna i nie posiada logiki biznesowej specyficznej dla QuizCards.
2.  **Funkcje publiczne (`ai.service.ts`):** Wysokopoziomowe funkcje, takie jak `generateQuizFromFlashcards`, które wykorzystują instancję `GeminiService` do realizacji konkretnych zadań biznesowych. To tutaj definiowane są prompty i schematy odpowiedzi.

## 3. Implementacja `GeminiService` (Klasa)

### Konstruktor

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

### `generateStructuredData<T extends z.ZodTypeAny>(...)`

Jest to generyczna metoda publiczna, która będzie głównym interfejsem usługi.

- **Cel:** Generowanie ustrukturyzowanych danych w formacie JSON na podstawie podanego schematu Zod.
- **Parametry:**
  - `systemPrompt` (string): Instrukcja dla modelu, która definiuje jego rolę i ogólne zasady.
  - `userPrompt` (string): Konkretne polecenie od użytkownika.
  - `schema` (T extends z.ZodTypeAny): Schemat Zod definiujący oczekiwaną strukturę odpowiedzi.
- **Zwraca:** `Promise<z.infer<T>>` - Obiekt zgodny ze zdefiniowanym schematem.
- **Rzuca błędy:** W przypadku problemów z API, walidacją lub filtrami bezpieczeństwa, metoda będzie rzucać customowe błędy (patrz sekcja 6. Obsługa błędów).

### Metody prywatne

#### `private getModel(...)`

- **Cel:** Inicjalizacja i zwrócenie instancji modelu generatywnego z odpowiednią konfiguracją.
- **Parametry:**
  - `generationConfig` (object): Obiekt konfiguracyjny dla modelu (temperatura, `responseMimeType` itp.).
- **Zwraca:** Instancję `GenerativeModel`.

#### `private buildPrompt(...)`

- **Cel:** Zbudowanie pełnego, sformatowanego promptu, który zawiera instrukcję systemową, zapytanie użytkownika oraz opis oczekiwanego schematu JSON.
- **Parametry:**
  - `systemPrompt` (string): Instrukcja systemowa.
  - `userPrompt` (string): Zapytanie użytkownika.
  - `schema` (z.ZodTypeAny): Schemat Zod do konwersji na schemat JSON i dołączenia do promptu.
- **Zwraca:** Pełny prompt w formie stringa.

#### `private validateAndParseResponse(...)`

- **Cel:** Parsowanie odpowiedzi tekstowej z API (która powinna być JSON-em) i walidacja jej względem podanego schematu Zod.
- **Parametry:**
  - `response` (string): Surowa odpowiedź tekstowa z modelu Gemini.
  - `schema` (T extends z.ZodTypeAny): Schemat Zod do walidacji.
- **Zwraca:** Sparsowany i zwalidowany obiekt.
- **Rzuca błędy:** `InvalidResponseDataError`, jeśli odpowiedź nie jest poprawnym JSON-em lub nie jest zgodna ze schematem.

## 4. Publiczna funkcja `generateQuizFromFlashcards`

Ta funkcja będzie głównym punktem wejścia do generowania quizów w trybie wsadowym. Wykorzysta ona `geminiService` do komunikacji z AI.

- **Cel:** Wygenerowanie kompletnego quizu (tytuł + pytania z dystraktorami) na podstawie listy fiszek.
- **Parametry:**
  - `flashcards` (Flashcard[]): Tablica obiektów zawierających `question` i `answer`.
  - `topic` (string): Temat quizu, na podstawie którego AI może wygenerować tytuł.
  - `generationConfig` (object, opcjonalnie): Konfiguracja dla modelu (np. `temperature`).
- **Zwraca:** `Promise<GeneratedQuiz>` - Obiekt z tytułem i listą pytań zgodny ze zdefiniowanym schematem Zod.

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

### Krok 3: Implementacja `ai.service.ts`

1.  Utwórz plik `src/lib/services/ai.service.ts` (jeśli nie istnieje).
2.  Zaimplementuj klasę `GeminiService` zgodnie ze strukturą opisaną w sekcji 3.
3.  Zdefiniuj schematy Zod i typy dla przetwarzania wsadowego. Umieść je w `src/lib/validators/ai.validator.ts`.

**Schematy walidacji (`ai.validator.ts`):**

```typescript
import { z } from "zod";

// Schemat dla pojedynczego wygenerowanego pytania
const GeneratedQuestionSchema = z.object({
  question: z.string().describe("Oryginalne pytanie z fiszki."),
  correctAnswer: z.string().describe("Poprawna odpowiedź z fiszki."),
  incorrectAnswers: z.array(z.string()).length(3).describe("Tablica trzech wygenerowanych, błędnych odpowiedzi."),
});

// Schemat dla całego quizu - to jest struktura, której oczekujemy od AI
export const GeneratedQuizSchema = z.object({
  title: z.string().describe("Tytuł quizu wygenerowany na podstawie tematu i fiszek."),
  questions: z.array(GeneratedQuestionSchema),
});
```

4.  Zaimplementuj publiczną funkcję `generateQuizFromFlashcards`.

**Implementacja `generateQuizFromFlashcards` (`ai.service.ts`):**

```typescript
import { geminiService } from "./ai.service";
import { GeneratedQuizSchema } from "../validators/ai.validator";
import type { Flashcard } from "@/types"; // Zakładając, że typ Flashcard jest zdefiniowany globalnie

export async function generateQuizFromFlashcards(flashcards: Flashcard[], topic: string) {
  const systemPrompt = `Jesteś ekspertem w tworzeniu quizów wielokrotnego wyboru. Twoim zadaniem jest wygenerowanie kompletnego quizu na podstawie dostarczonej listy fiszek.
Każda fiszka zawiera pytanie i poprawną odpowiedź. Dla każdego pytania musisz stworzyć 3 wiarygodne, ale nieprawidłowe odpowiedzi (dystraktory).
Dystraktory powinny być tematycznie powiązane z pytaniem, podobnej długości i formatu co poprawna odpowiedź.
Na podstawie tematu i treści fiszek, stwórz również zwięzły, chwytliwy tytuł dla całego quizu.`;

  const userPrompt = `
    Temat quizu: ${topic}

    Na podstawie poniższej listy fiszek, wygeneruj kompletny quiz.
    Fiszki:
    ${flashcards.map((f, i) => `${i + 1}. Pytanie: "${f.question}", Poprawna odpowiedź: "${f.answer}"`).join("\n")}
  `;

  try {
    const quizData = await geminiService.generateStructuredData(systemPrompt, userPrompt, GeneratedQuizSchema);
    return quizData;
  } catch (error) {
    // Logowanie i ponowne rzucenie błędu
    console.error("Failed to generate quiz from flashcards", error);
    // Rzuć błąd dalej, aby obsłużyć go w endpoincie
    throw error;
  }
}
```

### Krok 4: Integracja z endpointem API Astro

1.  Zmodyfikuj endpoint API `src/pages/api/quizzes/generate.ts`, aby używał nowej funkcji wsadowej.
2.  Endpoint powinien teraz przyjmować URL do Quizlet, pobierać z niego fiszki (przy użyciu `quizlet.service`), a następnie przekazywać je do `generateQuizFromFlashcards`.

**Przykład endpointu `generate.ts`:**

```typescript:src/pages/api/quizzes/generate.ts
import type { APIRoute } from "astro";
import { z } from "zod";
import { generateQuizFromFlashcards } from "@/lib/services/ai.service";
import { getFlashcardsFromUrl } from "@/lib/services/quizlet.service"; // Założenie, że ta usługa istnieje
import { BaseError } from "@/lib/errors";
import { quizService } from "@/lib/services/quiz.service"; // Założenie, że ta usługa istnieje do zapisu w DB

export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.session?.user.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 1. Walidacja wejścia
  const body = await request.json();
  const inputSchema = z.object({ quizletUrl: z.string().url() });
  const parseResult = inputSchema.safeParse(body);

  if (!parseResult.success) {
    return new Response(JSON.stringify(parseResult.error), { status: 400 });
  }
  const { quizletUrl } = parseResult.data;

  try {
    // 2. Pobranie fiszek z Quizlet
    const { flashcards, title: originalTitle } = await getFlashcardsFromUrl(quizletUrl);
    if (!flashcards || flashcards.length === 0) {
      return new Response("Could not find any flashcards in the provided set.", { status: 404 });
    }

    // 3. Wywołanie usługi Gemini w trybie wsadowym
    const generatedQuiz = await generateQuizFromFlashcards(flashcards, originalTitle);

    // 4. Zapisanie quizu do bazy danych
    const createdQuiz = await quizService.createQuizFromGeneratedData(generatedQuiz, userId);

    return new Response(JSON.stringify(createdQuiz), { status: 201 });

  } catch (error) {
    if (error instanceof BaseError) {
      console.error(`GeminiService Error: ${error.name}`, error.message);
      return new Response(JSON.stringify({ message: error.message }), { status: 500 });
    }
    console.error("Unknown error during quiz generation:", error);
    return new Response("An unexpected error occurred.", { status: 500 });
  }
};
```
