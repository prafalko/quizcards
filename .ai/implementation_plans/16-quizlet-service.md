# Przewodnik Implementacji: `quizlet.service`

## 1. Opis usługi

`QuizletService` to moduł TypeScript odpowiedzialny za pobieranie i parsowanie publicznych zestawów fiszek z serwisu Quizlet. Jego głównym zadaniem jest przyjęcie adresu URL do zestawu Quizlet, wyodrębnienie z niego niezbędnych informacji (ID zestawu i tytuł), wykonanie zapytania do wewnętrznego API Quizlet (webapi), a następnie przetworzenie odpowiedzi do ustandaryzowanego formatu.

Usługa będzie w pełni hermetyzować logikę interakcji z Quizlet, dostarczając prosty interfejs do wykorzystania w endpointach API Astro.

## 2. Opis konstruktora

Usługa będzie zaimplementowana jako zbiór eksportowanych funkcji w module `quizlet.service.ts`. Będzie bezstanowa, co oznacza, że nie wymaga instancji klasy ani konstruktora. Każda funkcja będzie operować wyłącznie na danych wejściowych.

## 3. Publiczne metody i pola

### Funkcje

#### `getQuizletSet(url: string): Promise<QuizletSet>`

Główna i jedyna publiczna funkcja usługi. Orkiestruje cały proces pobierania fiszek.

- **Parametry:**
  - `url` (string): Pełny, publiczny adres URL do zestawu fiszek na Quizlet.
- **Zwraca:** `Promise<QuizletSet>` - Obietnicę, która rozwiązuje się obiektem zawierającym dane zestawu.
- **Rzuca błędy:** `InvalidQuizletUrlError`, `QuizletApiError`, `DataValidationError` w przypadku niepowodzenia.

### Typy

Należy zdefiniować następujące typy, np. w pliku `src/types.ts` lub lokalnie w pliku serwisu.

```typescript
interface Flashcard {
  term: string;
  definition: string;
}

interface QuizletSet {
  id: number;
  title: string;
  flashcards: Flashcard[];
}
```

## 4. Prywatne metody i pola

Logika wewnętrzna zostanie podzielona na mniejsze, prywatne funkcje (nieeksportowane z modułu), aby zachować czystość kodu i separację odpowiedzialności.

### Funkcje

#### `_extractDataFromUrl(url: string): { setId: string; title: string }`

- **Cel:** Parsowanie adresu URL w celu wyodrębnienia ID zestawu i tytułu.
- **Logika:** Użyje wyrażenia regularnego do znalezienia ID (`/(\d+)/`) oraz sluga tytułu. Tytuł zostanie oczyszczony (zamiana myślników na spacje, usunięcie "flash-cards"). Jeśli tytuł nie zostanie znaleziony, zostanie zwrócony domyślny tytuł "My quizlet set".

#### `_fetchQuizletData(setId: string): Promise<QuizletApiResponse>`

- **Cel:** Wykonanie zapytania `GET` do webapi Quizlet.
- **Logika:** Skonstruuje pełny adres URL endpointa, używając `setId`. Wykorzysta natywny interfejs `fetch` do wysłania zapytania. Sprawdzi status odpowiedzi HTTP – jeśli nie jest `2xx`, rzuci błąd `QuizletApiError`. W przypadku sukcesu, sparsuje odpowiedź JSON i zwróci ją.

#### `_transformApiResponse(data: QuizletApiResponse, title: string, setId: string): QuizletSet`

- **Cel:** Transformacja surowej odpowiedzi z API do docelowego formatu `QuizletSet`.
- **Logika:** Użyje schematu walidacji `Zod` do weryfikacji struktury odpowiedzi. Następnie zmapuje tablicę `studiableItem` na tablicę `flashcards`, wyciągając `plainText` z odpowiednich pól (`cardSides[0]` dla terminu, `cardSides[1]` dla definicji).

### Walidacja (Zod)

Kluczowym elementem będzie stworzenie schematów Zod do walidacji odpowiedzi z API, co zapewni bezpieczeństwo typów i integralność danych.

```typescript
// Przykład schematu Zod
import { z } from "zod";

const CardSideSchema = z.object({
  media: z.array(
    z.object({
      plainText: z.string(),
    })
  ),
});

const StudiableItemSchema = z.object({
  cardSides: z.tuple([CardSideSchema, CardSideSchema]),
});

const QuizletApiResponseSchema = z.object({
  responses: z.array(
    z.object({
      models: z.object({
        studiableItem: z.array(StudiableItemSchema),
      }),
    })
  ),
});

type QuizletApiResponse = z.infer<typeof QuizletApiResponseSchema>;
```

## 5. Obsługa błędów

Należy zdefiniować niestandardowe klasy błędów (np. w `src/lib/errors.ts`), aby zapewnić spójną i przewidywalną obsługę wyjątków.

- `InvalidQuizletUrlError`: Rzucany przez `_extractDataFromUrl`, gdy podany URL jest nieprawidłowy lub nie zawiera ID zestawu.
- `QuizletApiError`: Rzucany przez `_fetchQuizletData` w przypadku problemów sieciowych lub gdy API Quizlet zwróci status błędu (np. 404 dla nieistniejącego zestawu, 500).
- `DataValidationError`: Rzucany przez `_transformApiResponse`, gdy odpowiedź z API nie przejdzie walidacji schematem Zod, co wskazuje na nieoczekiwaną strukturę danych.

## 6. Kwestie bezpieczeństwa

- **Walidacja wejścia:** Adres URL pochodzi od użytkownika, dlatego musi być rygorystycznie sprawdzany za pomocą wyrażenia regularnego, aby wyodrębnić tylko cyfry (ID) i bezpieczny tekst (tytuł).
- **Zapytania po stronie serwera:** Wszystkie zapytania do API Quizlet muszą być wykonywane z backendu (endpoint Astro). Zapobiega to problemom z CORS i ukrywa logikę przed klientem.
- **Ograniczenie zapytań:** Chociaż obecnie API jest publiczne, należy rozważyć dodanie mechanizmu rate-limitingu na poziomie endpointu Astro, aby chronić usługę przed nadużyciami.

## 7. Plan wdrożenia krok po kroku

### Krok 1: Definicja typów i niestandardowych błędów

1.  W `src/types.ts` dodaj interfejsy `Flashcard` i `QuizletSet`.
2.  W `src/lib/errors.ts` utwórz klasy `InvalidQuizletUrlError`, `QuizletApiError` i `DataValidationError`, które dziedziczą po `Error`.

### Krok 2: Utworzenie pliku serwisu i schematów Zod

1.  Utwórz plik `src/lib/services/quizlet.service.ts`.
2.  Zainstaluj Zod, jeśli nie jest jeszcze w projekcie (`npm install zod`).
3.  Wewnątrz pliku serwisu zdefiniuj schematy Zod (`CardSideSchema`, `StudiableItemSchema`, `QuizletApiResponseSchema`) do walidacji odpowiedzi z API.

### Krok 3: Implementacja funkcji prywatnych

1.  **`_extractDataFromUrl`**:
    - Napisz funkcję, która przyjmuje `url: string`.
    - Użyj wyrażenia regularnego, np. `quizlet\.com\/(?:[a-z]{2}\/)?(\d+)\/([a-zA-Z0-9-]+)/`, do przechwycenia ID i sluga tytułu.
    - Jeśli dopasowanie się nie powiedzie, rzuć `InvalidQuizletUrlError`.
    - Przetwórz slug, aby uzyskać czysty tytuł. W przypadku braku sluga, użyj wartości domyślnej.
    - Zwróć `{ setId, title }`.

2.  **`_fetchQuizletData`**:
    - Napisz asynchroniczną funkcję, która przyjmuje `setId: string`.
    - Zdefiniuj stałą z adresem URL endpointa API Quizlet.
    - Użyj `URLSearchParams` do zbudowania query stringa.
    - Wywołaj `fetch` w bloku `try...catch`. W `catch` rzuć `QuizletApiError` z informacją o błędzie sieciowym.
    - Sprawdź `response.ok`. Jeśli `false`, rzuć `QuizletApiError` ze statusem i tekstem błędu.
    - Zwróć `await response.json()`.

3.  **`_transformApiResponse`**:
    - Napisz funkcję, która przyjmuje `data: unknown`, `title: string`, `setId: string`.
    - Użyj `QuizletApiResponseSchema.safeParse(data)` do walidacji. Jeśli walidacja się nie powiedzie, rzuć `DataValidationError`, dołączając szczegóły błędu z Zod.
    - Jeśli walidacja się powiedzie, zmapuj `validatedData.responses[0].models.studiableItem` do formatu `Flashcard[]`.
    - Zwróć kompletny obiekt `QuizletSet`.

### Krok 4: Implementacja funkcji publicznej `getQuizletSet`

1.  Stwórz asynchroniczną, eksportowaną funkcję `getQuizletSet(url: string)`.
2.  Wewnątrz bloku `try...catch` wywołaj kolejno:
    - `const { setId, title } = _extractDataFromUrl(url);`
    - `const apiResponse = await _fetchQuizletData(setId);`
    - `const quizletSet = _transformApiResponse(apiResponse, title, setId);`
    - `return quizletSet;`
3.  Blok `catch` powinien łapać rzucone błędy i przekazywać je dalej.

### Krok 5: Integracja z endpointem API Astro

1.  Utwórz nowy plik endpointu, np. `src/pages/api/quizzes/import.ts`.
2.  Zaimplementuj handler `POST`, który odczyta `url` z ciała żądania.
3.  Zwaliduj wejście (np. za pomocą Zod), sprawdzając, czy `url` jest poprawnym stringiem URL.
4.  Wywołaj `getQuizletSet(url)` w bloku `try...catch`.
5.  W przypadku sukcesu, zwróć odpowiedź JSON z kodem `200` i danymi zestawu.
6.  W bloku `catch` obsłuż poszczególne typy błędów i zwróć odpowiednie kody statusu HTTP (np. `400` dla `InvalidQuizletUrlError`, `404` lub `502` dla `QuizletApiError`, `500` dla `DataValidationError`).

```typescript
// Przykład src/pages/api/quizzes/import.ts
import type { APIRoute } from "astro";
import { getQuizletSet } from "@lib/services/quizlet.service";
import { InvalidQuizletUrlError, QuizletApiError, DataValidationError } from "@lib/errors";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { url } = body; // TODO: Add validation with Zod

    if (!url) {
      return new Response(JSON.stringify({ message: "URL is required" }), { status: 400 });
    }

    const quizletSet = await getQuizletSet(url);

    return new Response(JSON.stringify(quizletSet), { status: 200 });
  } catch (error) {
    if (error instanceof InvalidQuizletUrlError) {
      return new Response(JSON.stringify({ message: error.message }), { status: 400 });
    }
    if (error instanceof QuizletApiError) {
      // Log the original error for debugging
      console.error(error);
      return new Response(JSON.stringify({ message: "Failed to fetch data from Quizlet." }), { status: 502 }); // Bad Gateway
    }
    if (error instanceof DataValidationError) {
      // Log the original error for debugging
      console.error(error);
      return new Response(JSON.stringify({ message: "Failed to parse Quizlet data." }), { status: 500 });
    }
    // Generic error
    console.error(error);
    return new Response(JSON.stringify({ message: "An unexpected error occurred." }), { status: 500 });
  }
};
```

### Krok 6: Wyjaśnienie dotyczące terminologii AI

W oryginalnym zapytaniu pojawiły się terminy takie jak `Komunikat systemowy`, `response_format` czy `Nazwa modelu`. Należy podkreślić, że **są one specyficzne dla interakcji z modelami językowymi (AI), a nie dla budowy klienta API, jakim jest `QuizletService`**.

- **Cel `QuizletService`:** Wywołanie deterministycznego, ustrukturyzowanego endpointu REST API i przetworzenie jego danych.
- **Cel usługi AI:** Wysłanie promptu (instrukcji w języku naturalnym) do modelu AI i otrzymanie wygenerowanej, często nie w pełni przewidywalnej odpowiedzi.

`QuizletService` nie korzysta z żadnych mechanizmów AI, więc te koncepcje nie mają tu zastosowania.
