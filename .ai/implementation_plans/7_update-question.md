# API Endpoint Implementation Plan: Update Question Text

## 1. Przegląd punktu końcowego
Endpoint ma za zadanie aktualizację tekstu dla istniejącego pytania. Umożliwia modyfikację pola `question_text` na podstawie identyfikatora UUID pytania. Operacja jest ograniczona do właściciela quizu, do którego należy dane pytanie, co zapewnia bezpieczeństwo i integralność danych. Po pomyślnej aktualizacji, pole `updated_at` w tabeli `quiz_questions` również zostanie zaktualizowane.

## 2. Szczegóły żądania
- **Metoda HTTP:** `PATCH`
- **Ścieżka URL:** `/api/questions/:id`
- **Parametry:**
  - **Wymagane w ścieżce:**
    - `id`: UUID pytania, które ma zostać zaktualizowane.
  - **Wymagane w ciele żądania:**
    - `question_text`: Nowy tekst pytania (string, min 1, max 2048 znaków).
- **Ciało żądania (Request Body):**
  ```json
  {
    "question_text": "Updated question text?"
  }
  ```

## 3. Wykorzystywane typy
- **DTO zdefiniowane w `src/types.ts`:**
  - `UpdateQuestionCommand`: Model polecenia używany do walidacji danych wejściowych z ciała żądania.
  - `QuestionDetailDTO`: Struktura danych zwracana w odpowiedzi po pomyślnej aktualizacji, zawierająca pełne informacje o pytaniu i jego odpowiedziach.

## 4. Szczegóły odpowiedzi
- **Sukces (200 OK):**
  - Zwraca obiekt `QuestionDetailDTO` zawierający zaktualizowane dane pytania wraz z listą odpowiedzi. Pole `updated_at` zostanie automatycznie zaktualizowane.
  ```json
  {
    "id": "uuid",
    "question_text": "Updated question text?",
    "metadata": { ... },
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-01-20T11:30:00Z",
    "answers": [ ... ]
  }
  ```
- **Kody statusu błędów:**
  - `400 Bad Request`: Niepoprawny format UUID, błędy walidacji ciała żądania (np. brak `question_text`, za długi `question_text`).
  - `401 Unauthorized`: (Docelowo) Użytkownik nie jest uwierzytelniony.
  - `404 Not Found`: Pytanie o podanym `id` nie istnieje lub użytkownik nie ma do niego uprawnień.
  - `500 Internal Server Error`: Błędy serwera, np. problem z połączeniem do bazy danych.

## 5. Przepływ danych
1. Handler endpointu otrzymuje żądanie `PATCH` z `id` w URL i `question_text` w ciele.
2. Walidacja parametru `id`, aby upewnić się, że jest to poprawny UUID.
3. Walidacja ciała żądania przy użyciu dedykowanej schemy Zod.
4. Pobranie `user_id` (dla MVP będzie to stała `SUPABASE_DEFAULT_USER_ID`, docelowo z kontekstu `Astro.locals`).
5. Wywołanie nowej metody `quizService.updateQuestionText(id, userId, validatedData)`.
6. Wewnątrz serwisu, wykonanie zapytania `UPDATE` do tabeli `quiz_questions`, aktualizując `question_text` i `updated_at`. Zapytanie musi weryfikować, czy pytanie należy do quizu, którego właścicielem jest dany `userId`.
7. Jeśli `UPDATE` nie zmodyfikował żadnego wiersza, oznacza to, że pytanie nie istnieje lub użytkownik nie ma uprawnień - serwis rzuca błąd `NotFoundError`.
8. Po pomyślnej aktualizacji, serwis pobiera zaktualizowane pytanie wraz z odpowiedziami.
9. Serwis zwraca zmapowane dane w formacie `QuestionDetailDTO`.
10. Handler endpointu serializuje DTO do formatu JSON i zwraca odpowiedź z kodem statusu 200 OK.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie i autoryzacja:** Dostęp do endpointu docelowo będzie wymagał uwierzytelnienia przez Supabase Auth. Na etapie MVP operacje będą wykonywane w kontekście stałego `user_id`.
- **Zapobieganie IDOR:** Kluczowe jest, aby operacja `UPDATE` w bazie danych zawsze weryfikowała własność zasobu poprzez sprawdzenie `user_id` w powiązanej tabeli `quizzes`.
- **Walidacja wejścia:** Rygorystyczna walidacja `id` (format UUID) i `question_text` (typ, długość) za pomocą Zod chroni przed niepoprawnymi danymi i potencjalnymi atakami.

## 7. Obsługa błędów
- **Błędy walidacji (400):** Zostaną przechwycone i obsłużone, zwracając szczegółowe komunikaty o błędach.
- **Brak zasobu (404):** Jeśli `quizService` nie znajdzie odpowiedniego pytania do aktualizacji, rzuci błąd `NotFoundError`, który zostanie zmapowany na odpowiedź 404.
- **Błąd serwera (500):** Wszelkie nieoczekiwane błędy (np. błędy bazy danych) zostaną przechwycone, zalogowane przez `LoggerService` i zmapowane na standardową odpowiedź 500.

## 8. Rozważania dotyczące wydajności
- Operacja `UPDATE` na pojedynczym wierszu jest wysoce wydajna, zwłaszcza przy użyciu indeksu na kluczu głównym (`id`).
- Zapytanie weryfikujące uprawnienia użytkownika powinno być zoptymalizowane, aby unikać zbędnych złączeń (JOIN).
- Po aktualizacji, pobranie pełnych danych pytania z odpowiedziami powinno być zrealizowane za pomocą jednego, efektywnego zapytania.

## 9. Etapy wdrożenia
1. **Rozszerzenie walidatora:**
   - W pliku `src/lib/validators/quiz.validator.ts` dodać nowy schemat Zod (`updateQuestionTextSchema`) do walidacji ciała żądania (`question_text`).
2. **Implementacja w Quiz Service:**
   - W pliku `src/lib/services/quiz.service.ts` utworzyć nową metodę `updateQuestionText(id, userId, data)`.
   - Metoda będzie zawierać logikę aktualizacji pytania w bazie Supabase, weryfikację uprawnień oraz pobranie i zwrócenie zaktualizowanych danych jako `QuestionDetailDTO`.
3. **Implementacja endpointu API:**
   - Utworzyć nowy plik `src/pages/api/questions/[id].ts` (jeśli jeszcze nie istnieje) i dodać w nim handler dla metody `PATCH`.
   - Handler będzie odpowiedzialny za parsowanie `id` i ciała żądania, wywołanie walidatora, wywołanie metody serwisu i zwrócenie odpowiedzi lub błędu.
4. **Testowanie:**
   - Przeprowadzić testy integracyjne endpointu `PATCH /api/questions/:id` przy użyciu narzędzia do testowania API (np. Postman), sprawdzając scenariusze sukcesu i błędów (400, 404).
