# API Endpoint Implementation Plan: Get Question Details

## 1. Przegląd punktu końcowego
Endpoint ma za zadanie pobranie szczegółowych informacji o konkretnym pytaniu wraz ze wszystkimi jego odpowiedziami. Jest to kluczowy endpoint do wyświetlania pojedynczego pytania, na przykład w widoku edycji. Dostęp jest ograniczony do właściciela quizu, do którego należy pytanie.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Ścieżka URL:** `/api/questions/:id`
- **Parametry:**
  - **Wymagane w ścieżce:**
    - `id`: UUID pytania

## 3. Wykorzystywane typy
- **DTO zdefiniowane w `src/types.ts`:**
  - `QuestionDetailDTO` – pełna struktura pytania z odpowiedziami, używana w odpowiedzi API.
  - `AnswerDTO` - struktura pojedynczej odpowiedzi w ramach `QuestionDetailDTO`.

## 4. Szczegóły odpowiedzi
- **Sukces (200 OK):**
  ```json
  {
    "id": "uuid",
    "question_text": "What is photosynthesis?",
    "metadata": {
      "model": "gemini-pro",
      "temperature": 0.7,
      "seed": 12345,
      "prompt": "Generate 3 incorrect answers..."
    },
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-01-20T10:00:00Z",
    "answers": [
      {
        "id": "uuid",
        "answer_text": "The process by which plants convert light energy into chemical energy",
        "is_correct": true
      }
    ]
  }
  ```
- **Kody statusu błędów:**
  - 400 Bad Request – niepoprawny format UUID.
  - 401 Unauthorized – brak autoryzacji użytkownika (w przyszłości).
  - 404 Not Found – pytanie nie istnieje lub użytkownik nie ma do niego dostępu.
  - 500 Internal Server Error – błędy serwera lub bazy danych.

## 5. Przepływ danych
1. Endpoint odbiera żądanie GET z UUID pytania w ścieżce.
2. Parametr `id` jest walidowany (musi być prawidłowym UUID).
3. Pobierany jest identyfikator użytkownika z kontekstu (MVP: `SUPABASE_DEFAULT_USER_ID`).
4. Wywoływana jest metoda `getQuestionById(questionId, userId)` z `quiz.service.ts`.
5. Serwis wykonuje zapytanie do bazy danych, które pobiera pytanie oraz jego odpowiedzi, jednocześnie sprawdzając, czy pytanie należy do quizu, którego właścicielem jest dany `userId`.
6. Jeśli zasób nie zostanie znaleziony lub użytkownik nie ma uprawnień, serwis zwraca błąd.
7. Dane z bazy są mapowane na `QuestionDetailDTO`.
8. Endpoint zwraca zmapowane dane z kodem statusu 200.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie i autoryzacja:** Dostęp do endpointu w przyszłości będzie chroniony przez middleware Supabase. W fazie MVP zapytania będą filtrowane po stałym `SUPABASE_DEFAULT_USER_ID`.
- **Izolacja danych (IDOR Prevention):** Kluczowym mechanizmem bezpieczeństwa jest weryfikacja w serwisie, czy żądane pytanie należy do quizu, który jest własnością zalogowanego użytkownika. Zapobiega to wyciekowi danych między kontami.
- **Walidacja wejścia:** Parametr `id` musi być walidowany jako UUID, aby zapobiec błędom zapytań i potencjalnym atakom.

## 7. Obsługa błędów
- **Błędy walidacji (400):** Jeśli `id` nie jest prawidłowym UUID, API zwróci błąd 400.
- **Brak zasobu (404):** Jeśli pytanie nie istnieje lub należy do innego użytkownika, API zwróci błąd 404, aby nie ujawniać informacji o istnieniu zasobu.
- **Błąd serwera (500):** W przypadku problemów z połączeniem z bazą danych, błąd zostanie zarejestrowany za pomocą `logger.service.ts`, a API zwróci generyczny błąd 500.

## 8. Rozważania dotyczące wydajności
- **Optymalizacja zapytań:** Zapytanie pobierające pytanie i odpowiedzi powinno być wykonane jako pojedyncze zapytanie z `JOIN`, aby zminimalizować liczbę odwołań do bazy danych.
- **Indeksy:** Należy upewnić się, że kolumny `id` w tabelach `quiz_questions` i `quizzes` oraz `user_id` w tabeli `quizzes` są odpowiednio zindeksowane.

## 9. Etapy wdrożenia
1.  **Aktualizacja walidatora:**
    -   W pliku `src/lib/validators/quiz.validator.ts` dodać schemę Zod do walidacji parametru `id` jako UUID.
2.  **Implementacja w `quiz.service.ts`:**
    -   Stworzyć nową, asynchroniczną metodę `getQuestionById(questionId: string, userId: string)`.
    -   Zaimplementować w niej logikę zapytania do Supabase, które pobierze pytanie wraz z odpowiedziami i zweryfikuje uprawnienia użytkownika.
3.  **Implementacja endpointu API:**
    -   Utworzyć nowy plik `src/pages/api/questions/[id].ts`.
    -   Zaimplementować w nim handler `GET`, który będzie zarządzał walidacją, wywołaniem serwisu oraz obsługą odpowiedzi i błędów.
4.  **Obsługa autoryzacji:**
    -   W handlerze `GET` zaimplementować pobieranie `user_id` (na etapie MVP będzie to stała wartość `SUPABASE_DEFAULT_USER_ID`).
5.  **Testowanie:**
    -   Przeprowadzić testy manualne endpointu, sprawdzając poprawność pobierania danych dla istniejącego pytania.
    -   Przetestować przypadki błędów: nieprawidłowy UUID (400) oraz próba dostępu do nieistniejącego lub cudzego pytania (404).
