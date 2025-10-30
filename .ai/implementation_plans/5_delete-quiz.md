# API Endpoint Implementation Plan: Delete Quiz

## 1. Przegląd punktu końcowego
Endpoint ma za zadanie permanentne usunięcie quizu oraz wszystkich powiązanych z nim pytań i odpowiedzi. Operacja jest nieodwracalna i może być wykonana wyłącznie przez właściciela danego quizu.

## 2. Szczegóły żądania
- **Metoda HTTP:** `DELETE`
- **Ścieżka URL:** `/api/quizzes/:id`
- **Parametry:**
  - **Wymagane w ścieżce:**
    - `id`: UUID quizu przeznaczonego do usunięcia.
- **Ciało żądania (Request Body):** Brak.

## 3. Wykorzystywane typy
- Ta operacja nie wymaga specyficznych typów DTO ani Command Models, ponieważ nie ma ciała żądania ani odpowiedzi.

## 4. Szczegóły odpowiedzi
- **Sukces (204 No Content):**
  - Pomyślne usunięcie quizu jest sygnalizowane pustą odpowiedzią z kodem statusu 204.
- **Kody statusu błędów:**
  - `400 Bad Request`: Niepoprawny format `id` (nie jest to UUID).
  - `401 Unauthorized`: (Docelowo) Użytkownik nie jest uwierzytelniony.
  - `404 Not Found`: Quiz o podanym `id` nie istnieje lub użytkownik nie ma uprawnień do jego usunięcia.
  - `500 Internal Server Error`: Wewnętrzne błędy serwera, np. błąd połączenia z bazą danych.

## 5. Przepływ danych
1. Handler endpointu otrzymuje żądanie `DELETE` z `id` w parametrze ścieżki.
2. Walidacja parametru `id` w celu upewnienia się, że jest to poprawny UUID.
3. Pobranie `user_id` (dla MVP będzie to stała `SUPABASE_DEFAULT_USER_ID`, docelowo z `Astro.locals`).
4. Wywołanie metody `quizService.deleteQuiz(id, userId)`.
5. Wewnątrz serwisu, wykonanie zapytania `DELETE FROM quizzes WHERE id = :id AND user_id = :userId`.
6. Baza danych, dzięki skonfigurowanym kluczom obcym z `ON DELETE CASCADE`, automatycznie usunie wszystkie pytania i odpowiedzi powiązane z usuwanym quizem.
7. Jeśli operacja `DELETE` nie usunęła żadnego wiersza (ponieważ quiz nie istnieje lub `user_id` się nie zgadza), serwis rzuca błąd `NotFoundError`.
8. Jeśli usunięcie się powiodło, serwis kończy działanie bez zwracania wartości.
9. Handler endpointu zwraca odpowiedź z kodem statusu `204 No Content`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie i autoryzacja:** Dostęp do endpointu musi być chroniony. Na etapie MVP operacje będą realizowane w kontekście `SUPABASE_DEFAULT_USER_ID`. Docelowo, `user_id` będzie pobierane z sesji użytkownika.
- **Zapobieganie IDOR:** Krytycznym elementem zabezpieczającym jest dodanie warunku `WHERE user_id = :userId` do zapytania `DELETE`. Gwarantuje to, że użytkownicy mogą usuwać wyłącznie własne quizy.
- **Walidacja wejścia:** Sprawdzanie formatu `id` (musi być UUID) chroni przed błędnymi zapytaniami do bazy danych.

## 7. Obsługa błędów
- **Błędy walidacji (400):** Niepoprawny format `id` zostanie przechwycony, a w odpowiedzi zostanie zwrócony błąd `400` z odpowiednim komunikatem.
- **Brak zasobu (404):** Jeśli `quizService` nie znajdzie quizu do usunięcia (lub nie będzie on należał do danego użytkownika), rzuci błąd `NotFoundError`, który zostanie zmapowany na odpowiedź `404`.
- **Błąd serwera (500):** Wszelkie inne błędy (np. awaria bazy danych) zostaną zarejestrowane przez `LoggerService` i zmapowane na standardową odpowiedź `500`.

## 8. Rozważania dotyczące wydajności
- Operacja `DELETE` oparta o klucz główny (`id`) jest wysoce wydajna.
- Kluczowe jest, aby w schemacie bazy danych poprawnie zdefiniowano kaskadowe usuwanie (`ON DELETE CASCADE`) dla tabel `quiz_questions` i `answers`, co zapewni spójność i wydajność operacji.
- Indeks na kolumnie `user_id` w tabeli `quizzes` przyspieszy weryfikację uprawnień.

## 9. Etapy wdrożenia
1. **Rozszerzenie walidatora:**
   - Upewnić się, że w `src/lib/validators/quiz.validator.ts` istnieje (lub dodać) mechanizm do walidacji formatu UUID dla parametru `id`.

2. **Implementacja w Quiz Service:**
   - W pliku `src/lib/services/quiz.service.ts` utworzyć nową metodę asynchroniczną `deleteQuiz(id: string, userId: string)`.
   - Metoda ta będzie zawierać logikę usunięcia quizu z bazy Supabase, weryfikując `id` i `user_id`.
   - W przypadku, gdy żaden rekord nie zostanie usunięty, metoda powinna rzucić błąd `NotFoundError`.

3. **Implementacja endpointu API:**
   - W pliku `src/pages/api/quizzes/[id].ts` dodać handler dla metody `DELETE`.
   - Handler będzie odpowiedzialny za:
     - Parsowanie i walidację `id` z `Astro.params`.
     - Wywołanie `quizService.deleteQuiz`.
     - Zwrócenie odpowiedzi `204 No Content` w przypadku sukcesu lub odpowiedniego błędu w przypadku porażki.

4. **Testowanie:**
   - Przeprowadzić testy integracyjne endpointu `DELETE /api/quizzes/:id` za pomocą narzędzia do testowania API (np. Postman), weryfikując scenariusze:
     - Pomyślne usunięcie quizu.
     - Próba usunięcia nieistniejącego quizu (oczekiwany błąd 404).
     - Próba usunięcia z niepoprawnym formatem UUID (oczekiwany błąd 400).
     - (Docelowo) Próba usunięcia quizu innego użytkownika (oczekiwany błąd 404).
