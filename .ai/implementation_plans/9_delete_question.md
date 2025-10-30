# API Endpoint Implementation Plan: Delete Question

## 1. Przegląd punktu końcowego

Endpoint ma za zadanie permanentne usunięcie pytania oraz wszystkich powiązanych z nim odpowiedzi. Operacja jest nieodwracalna i może być wykonana wyłącznie przez właściciela quizu, do którego należy dane pytanie. Wykorzystuje mechanizm kaskadowego usuwania w bazie danych. Po pomyślnym usunięciu pytania, aktualizowane jest również pole `updated_at` nadrzędnego quizu.

## 2. Szczegóły żądania

- **Metoda HTTP:** `DELETE`
- **Ścieżka URL:** `/api/questions/:id`
- **Parametry:**
  - **Wymagane w ścieżce:**
    - `id`: UUID pytania przeznaczonego do usunięcia.
- **Ciało żądania (Request Body):** Brak.

## 3. Wykorzystywane typy

- Ta operacja nie wymaga specyficznych typów DTO ani Command Models, ponieważ nie ma ciała żądania ani odpowiedzi.

## 4. Szczegóły odpowiedzi

- **Sukces (204 No Content):**
  - Pomyślne usunięcie pytania jest sygnalizowane pustą odpowiedzią z kodem statusu 204.
- **Kody statusu błędów:**
  - `400 Bad Request`: Niepoprawny format `id` (nie jest to UUID).
  - `401 Unauthorized`: (Docelowo) Użytkownik nie jest uwierzytelniony.
  - `404 Not Found`: Pytanie o podanym `id` nie istnieje lub użytkownik nie ma uprawnień do jego usunięcia.
  - `500 Internal Server Error`: Wewnętrzne błędy serwera, np. błąd połączenia z bazą danych.

## 5. Przepływ danych

1. Handler endpointu otrzymuje żądanie `DELETE` z `id` pytania w parametrze ścieżki.
2. Walidacja parametru `id` w celu upewnienia się, że jest to poprawny UUID.
3. Pobranie `user_id` (dla MVP będzie to stała `SUPABASE_DEFAULT_USER_ID`, docelowo z `Astro.locals`).
4. Wywołanie metody `quizService.deleteQuestion(id, userId)`.
5. Wewnątrz serwisu, w ramach jednej transakcji:
   a. Weryfikacja, czy pytanie o podanym `id` istnieje i należy do quizu, którego właścicielem jest `userId`. Jeśli nie, rzucany jest błąd `NotFoundError`.
   b. Pobranie `quiz_id` z usuwanego pytania.
   c. Usunięcie pytania z tabeli `quiz_questions`.
   d. Baza danych, dzięki `ON DELETE CASCADE`, automatycznie usuwa wszystkie powiązane odpowiedzi.
   e. Aktualizacja pola `updated_at` w tabeli `quizzes` dla pobranego `quiz_id`.
6. Jeśli transakcja się powiodła, serwis kończy działanie bez zwracania wartości.
7. Handler endpointu zwraca odpowiedź z kodem statusu `204 No Content`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie i autoryzacja:** Dostęp do endpointu musi być chroniony. Na etapie MVP operacje będą realizowane w kontekście `SUPABASE_DEFAULT_USER_ID`. Docelowo, `user_id` będzie pobierane z sesji użytkownika.
- **Zapobieganie IDOR:** Krytycznym elementem zabezpieczającym jest weryfikacja własności. Zapytanie `DELETE` musi być skonstruowane w taki sposób, aby sprawdzało, czy pytanie należy do quizu, którego właścicielem jest zalogowany użytkownik. Gwarantuje to, że użytkownicy mogą usuwać wyłącznie pytania w obrębie własnych quizów.
- **Walidacja wejścia:** Sprawdzanie formatu `id` (musi być UUID) chroni przed błędnymi zapytaniami do bazy danych.

## 7. Obsługa błędów

- **Błędy walidacji (400):** Niepoprawny format `id` zostanie przechwycony, a w odpowiedzi zostanie zwrócony błąd `400` z odpowiednim komunikatem.
- **Brak zasobu (404):** Jeśli `quizService` nie znajdzie pytania do usunięcia (lub nie będzie ono należało do quizu danego użytkownika), rzuci błąd `NotFoundError`, który zostanie zmapowany na odpowiedź `404`.
- **Błąd serwera (500):** Wszelkie inne błędy (np. awaria bazy danych) zostaną zarejestrowane przez `LoggerService` i zmapowane na standardową odpowiedź `500`.

## 8. Rozważania dotyczące wydajności

- Operacja `DELETE` oparta o klucz główny (`id`) jest wysoce wydajna.
- Kluczowe jest, aby w schemacie bazy danych poprawnie zdefiniowano kaskadowe usuwanie (`ON DELETE CASCADE`) dla tabeli `answers`, co zapewni spójność i wydajność operacji.
- Indeks na kolumnie `quiz_id` w tabeli `quiz_questions` oraz `user_id` w tabeli `quizzes` przyspieszy weryfikację uprawnień.

## 9. Etapy wdrożenia

1. **Rozszerzenie walidatora:**
   - W `src/lib/validators/quiz.validator.ts` dodać schemat walidacji UUID dla parametru `id`.

2. **Implementacja w Quiz Service:**
   - W pliku `src/lib/services/quiz.service.ts` utworzyć nową metodę asynchroniczną `deleteQuestion(questionId: string, userId: string)`.
   - Metoda ta będzie zawierać logikę usunięcia pytania z bazy Supabase, weryfikując `questionId` i `userId`.
   - W przypadku, gdy żaden rekord nie zostanie usunięty, metoda powinna rzucić błąd `NotFoundError`.

3. **Implementacja endpointu API:**
   - Utworzyć nowy plik `src/pages/api/questions/[id].ts`.
   - W pliku tym dodać handler dla metody `DELETE`.
   - Handler będzie odpowiedzialny za:
     - Parsowanie i walidację `id` z `Astro.params`.
     - Pobranie `userId` (MVP: stała wartość).
     - Wywołanie `quizService.deleteQuestion`.
     - Zwrócenie odpowiedzi `204 No Content` w przypadku sukcesu lub odpowiedniego błędu w przypadku porażki.

4. **Testowanie:**
   - Przeprowadzić testy integracyjne endpointu `DELETE /api/questions/:id` za pomocą narzędzia do testowania API (np. Postman), weryfikując scenariusze:
     - Pomyślne usunięcie pytania i powiązanych odpowiedzi.
     - Próba usunięcia nieistniejącego pytania (oczekiwany błąd 404).
     - Próba usunięcia z niepoprawnym formatem UUID (oczekiwany błąd 400).
     - (Docelowo) Próba usunięcia pytania z quizu innego użytkownika (oczekiwany błąd 404).
