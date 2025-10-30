# API Endpoint Implementation Plan: Update Answer

## 1. Przegląd punktu końcowego
Endpoint ma za zadanie aktualizację tekstu istniejącej odpowiedzi. Umożliwia modyfikację pola `answer_text` na podstawie identyfikatora UUID. Operacja jest ograniczona do właściciela quizu, do którego należy dana odpowiedź. Dodatkowo, jeśli odpowiedź została pierwotnie wygenerowana przez AI (`source: 'ai'`), jej status zmienia się na `ai-edited`. Każda aktualizacja odpowiedzi powoduje również odświeżenie znacznika `updated_at` w nadrzędnym quizie.

## 2. Szczegóły żądania
- **Metoda HTTP:** `PATCH`
- **Ścieżka URL:** `/api/answers/:id`
- **Parametry:**
  - **Wymagane w ścieżce:**
    - `id`: UUID odpowiedzi, która ma zostać zaktualizowana.
  - **Wymagane w ciele żądania:**
    - `answer_text`: Nowy tekst odpowiedzi (string, min 1, max 512 znaków).
- **Ciało żądania (Request Body):**
  ```json
  {
    "answer_text": "Updated answer text"
  }
  ```

## 3. Wykorzystywane typy
- **DTO zdefiniowane w `src/types.ts`:**
  - `UpdateAnswerCommand`: Model polecenia używany do walidacji danych wejściowych z ciała żądania.
  - `AnswerDTO`: Struktura danych zwracana w odpowiedzi po pomyślnej aktualizacji.

## 4. Szczegóły odpowiedzi
- **Sukces (200 OK):**
  - Zwraca obiekt `AnswerDTO` zawierający zaktualizowane dane odpowiedzi.
  ```json
  {
    "id": "uuid",
    "answer_text": "Updated answer text",
    "is_correct": false,
    "source": "ai-edited" 
  }
  ```
- **Kody statusu błędów:**
  - `400 Bad Request`: Niepoprawny format UUID, błędy walidacji ciała żądania.
  - `401 Unauthorized`: (Docelowo) Użytkownik nie jest uwierzytelniony.
  - `404 Not Found`: Odpowiedź o podanym `id` nie istnieje lub użytkownik nie ma do niej uprawnień.
  - `500 Internal Server Error`: Błędy serwera, np. problem z transakcją w bazie danych.

## 5. Przepływ danych
1. Handler endpointu otrzymuje żądanie `PATCH` z `id` w URL i `answer_text` w ciele.
2. Walidacja parametru `id` (musi być poprawnym UUID).
3. Walidacja ciała żądania przy użyciu schemy Zod (`updateAnswerSchema`).
4. Pobranie `user_id` (MVP: stała `SUPABASE_DEFAULT_USER_ID`, docelowo z `Astro.locals`).
5. Wywołanie nowej metody `quizService.updateAnswer(id, userId, validatedData)`.
6. Wewnątrz serwisu, w ramach jednej transakcji bazy danych:
   a. Pobranie odpowiedzi wraz z informacją o `user_id` właściciela quizu w celu weryfikacji uprawnień. Jeśli uprawnienia się nie zgadzają lub odpowiedź nie istnieje, rzucany jest błąd `NotFoundError`.
   b. Aktualizacja pola `answer_text` w tabeli `answers`.
   c. Warunkowa aktualizacja pola `source` na `ai-edited`, jeśli jego obecna wartość to `ai`.
   d. Aktualizacja pola `updated_at` w powiązanej tabeli `quiz_questions`.
7. Serwis zwraca zaktualizowaną odpowiedź w formacie `AnswerDTO`.
8. Handler endpointu serializuje DTO do formatu JSON i zwraca odpowiedź z kodem statusu 200 OK.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie i autoryzacja:** Dostęp docelowo będzie chroniony. Na etapie MVP operacje będą realizowane w kontekście `SUPABASE_DEFAULT_USER_ID`.
- **Zapobieganie IDOR:** Kluczowym elementem jest weryfikacja w serwisie, czy `user_id` z żądania zgadza się z `user_id` właściciela quizu, do którego należy odpowiedź. To zapobiega modyfikacji danych przez nieuprawnionych użytkowników.
- **Walidacja wejścia:** Walidacja `id` (format UUID) i `answer_text` (długość, typ) za pomocą Zod chroni przed niepoprawnymi danymi.

## 7. Obsługa błędów
- **Błędy walidacji (400):** Zostaną przechwycone i zwrócone z odpowiednim komunikatem.
- **Brak zasobu (404):** Jeśli `quizService` nie znajdzie odpowiedzi lub użytkownik nie będzie miał do niej uprawnień, rzuci błąd `NotFoundError`, mapowany na odpowiedź 404.
- **Błąd serwera (500):** Wszelkie błędy transakcji w bazie danych zostaną zalogowane przez `LoggerService` i zmapowane na standardową odpowiedź 500.

## 8. Rozważania dotyczące wydajności
- **Transakcje:** Użycie transakcji (`supabase.tx`) jest kluczowe dla zapewnienia spójności danych (atomowa aktualizacja dwóch tabel).
- **Indeksy:** Operacje `UPDATE` i `SELECT` będą wykonywane na podstawie kluczy głównych i obcych, które są domyślnie zindeksowane, co zapewnia wysoką wydajność.

## 9. Etapy wdrożenia
1. **Rozszerzenie walidatora:**
   - W pliku `src/lib/validators/quiz.validator.ts` dodać nowy schemat Zod (`updateAnswerSchema`) do walidacji ciała żądania (`answer_text`).
2. **Implementacja w Quiz Service:**
   - W pliku `src/lib/services/quiz.service.ts` utworzyć nową metodę `updateAnswer(id, userId, data)`.
   - Zaimplementować w niej logikę transakcji, która weryfikuje uprawnienia, aktualizuje odpowiedź oraz `updated_at` pytania.
3. **Implementacja endpointu API:**
   - Utworzyć nowy plik `src/pages/api/answers/[id].ts`.
   - Zaimplementować w nim handler dla metody `PATCH`, który będzie zarządzał walidacją, wywołaniem serwisu oraz obsługą odpowiedzi i błędów.
4. **Testowanie:**
   - Przeprowadzić testy integracyjne endpointu `PATCH /api/answers/:id` weryfikując:
     - Pomyślną aktualizację.
     - Poprawną zmianę statusu `source` z `ai` na `ai-edited`.
     - Aktualizację `updated_at` w tabeli `quiz_questions`.
     - Scenariusze błędów (400, 404).
     - Próbę modyfikacji odpowiedzi należącej do innego użytkownika (oczekiwany błąd 404).
