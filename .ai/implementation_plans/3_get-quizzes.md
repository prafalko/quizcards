# API Endpoint Implementation Plan: List User Quizzes

## 1. Przegląd punktu końcowego

Endpoint ma za zadanie pobranie listy wszystkich quizów należących do uwierzytelnionego użytkownika. Wyniki są sortowane od najnowszych. Umożliwia opcjonalne filtrowanie quizów na podstawie ich statusu (`draft` lub `published`).

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Ścieżka URL:** `/api/quizzes`
- **Parametry:**
  - **Opcjonalne w zapytaniu (Query):**
    - `status`: string - filtruje quizy po statusie (`draft` | `published`)

## 3. Wykorzystywane typy

- **DTO zdefiniowane w `src/types.ts`:**
  - `QuizzesListDTO` – typ odpowiedzi, będący tablicą `QuizListItemDTO`.
  - `QuizListItemDTO` – reprezentuje pojedynczy quiz na liście.
  - `QuizzesListQueryParams` – definiuje parametry zapytania.

## 4. Szczegóły odpowiedzi

- **Sukces (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "title": "Biology Flashcards Quiz",
      "status": "published",
      "source_url": "https://quizlet.com/...",
      "quizlet_set_id": "12345",
      "question_count": 25,
      "created_at": "2025-01-20T10:00:00Z",
      "updated_at": "2025-01-20T10:00:00Z"
    }
  ]
  ```
- **Kody statusu błędów:**
  - 400 Bad Request – niepoprawna wartość parametru `status`.
  - 401 Unauthorized – brak autoryzacji użytkownika.
  - 500 Internal Server Error – błędy serwera lub bazy danych.

## 5. Przepływ danych

1. Endpoint odbiera żądanie GET.
2. Parametry zapytania są walidowane za pomocą schemy Zod.
3. Pobierany jest identyfikator użytkownika z kontekstu (MVP: `SUPABASE_DEFAULT_USER_ID`).
4. Wywoływana jest metoda `getQuizzes` z `quiz.service.ts`, przekazując `user_id` i zwalidowane parametry.
5. Serwis wykonuje zapytanie do bazy danych, pobierając quizy, filtrując je po `user_id` i opcjonalnie po `status`. Zapytanie zlicza również liczbę pytań dla każdego quizu i sortuje wyniki malejąco po dacie utworzenia.
6. Dane z bazy są mapowane na `QuizzesListDTO`.
7. Endpoint zwraca zmapowane dane z kodem statusu 200.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie i autoryzacja:** W przyszłości endpoint będzie zabezpieczony przez middleware Supabase Auth. W fazie MVP zapytania będą filtrowane po stałym `SUPABASE_DEFAULT_USER_ID`.
- **Walidacja wejścia:** Parametr `status` jest walidowany, aby zapobiec nieoczekiwanym wartościom i potencjalnym atakom (np. SQL Injection, chociaż Supabase SDK temu przeciwdziała).
- **Izolacja danych:** Kluczowym mechanizmem bezpieczeństwa jest filtrowanie zapytań po `user_id`, co zapobiega wyciekowi danych między użytkownikami (IDOR).

## 7. Obsługa błędów

- **Błędy walidacji (400):** Jeśli parametr `status` będzie miał niedozwoloną wartość, API zwróci błąd 400 z informacją o błędzie walidacji.
- **Błąd serwera (500):** W przypadku problemów z połączeniem z bazą danych lub innych nieoczekiwanych błędów, zostanie zarejestrowany log błędu za pomocą `logger.service.ts`, a API zwróci generyczny błąd 500.

## 8. Rozważania dotyczące wydajności

- **Optymalizacja zapytań:** Zapytanie do bazy danych powinno być zoptymalizowane. Zamiast oddzielnych zapytań o liczbę pytań dla każdego quizu, należy użyć podzapytania lub `LEFT JOIN` z agregacją (`COUNT`), aby zminimalizować liczbę zapytań do bazy.
- **Indeksy:** Należy upewnić się, że kolumny `user_id` i `status` w tabeli `quizzes` są zindeksowane, aby przyspieszyć operacje filtrowania.
- **Paginacja:** W przyszłości, w miarę wzrostu liczby quizów, należy rozważyć wprowadzenie paginacji, aby ograniczyć ilość danych zwracanych w pojedynczym żądaniu.

## 9. Etapy wdrożenia

1.  **Aktualizacja walidatora:**
    - W `src/lib/validators/quiz.validator.ts` dodać nową schemę Zod do walidacji parametrów zapytania z `QuizzesListQueryParams`.
2.  **Implementacja w `quiz.service.ts`:**
    - Stworzyć nową, asynchroniczną metodę `getQuizzes(userId: string, params: QuizzesListQueryParams)`.
    - Zaimplementować w niej logikę zapytania do Supabase, uwzględniając filtrowanie, zliczanie pytań i sortowanie.
3.  **Implementacja endpointu API:**
    - Utworzyć nowy plik `src/pages/api/quizzes/index.ts`.
    - Zaimplementować w nim handler `GET`, który będzie zarządzał całym przepływem: walidacją, wywołaniem serwisu i obsługą błędów.
4.  **Obsługa autoryzacji:**
    - W handlerze `GET` zaimplementować pobieranie `user_id` (na etapie MVP będzie to stała wartość `SUPABASE_DEFAULT_USER_ID`).
5.  **Testowanie:**
    - Przeprowadzić testy manualne endpointu, sprawdzając poprawność działania bez filtrów oraz z filtrowaniem po `status='draft'` i `status='published'`.
    - Przetestować obsługę błędów dla nieprawidłowej wartości `status`.
