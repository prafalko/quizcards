````markdown
# API Endpoint Implementation Plan: Get Quiz Details

## 1. Przegląd punktu końcowego

Endpoint ma za zadanie pobranie szczegółowych informacji o konkretnym quizie wraz ze wszystkimi pytaniami i odpowiedziami. Jest to kluczowy endpoint do wyświetlania pełnej zawartości quizu użytkownikowi.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Ścieżka URL:** `/api/quizzes/:id`
- **Parametry:**
  - **Wymagane w ścieżce:**
    - `id`: UUID quizu

## 3. Wykorzystywane typy

- **DTO zdefiniowane w `src/types.ts`:**
  - `QuizDetailDTO` – pełna struktura quizu z pytaniami i odpowiedziami
  - `QuestionDetailDTO` - struktura pojedynczego pytania z odpowiedziami
  - `AnswerDTO` - struktura pojedynczej odpowiedzi
- Upewnij się, że typy używane w odpowiedzi spełniają wymagania: `id`, `title`, `status`, `source_url`, `quizlet_set_id`, `created_at`, `updated_at`, `questions[]`.

## 4. Szczegóły odpowiedzi

- **Sukces (200 OK):**
  ```json
  {
    "id": "uuid",
    "title": "Biology Flashcards Quiz",
    "status": "published",
    "source_url": "https://quizlet.com/...",
    "quizlet_set_id": "12345",
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-01-20T10:00:00Z",
    "questions": [
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
          },
          {
            "id": "uuid",
            "answer_text": "The process of cellular respiration in plants",
            "is_correct": false
          }
        ]
      }
    ]
  }
  ```
````

- **Kody statusu błędów:**
  - 400 Bad Request – niepoprawny format UUID
  - 401 Unauthorized – brak autoryzacji użytkownika
  - 404 Not Found – quiz nie istnieje lub użytkownik nie ma dostępu
  - 500 Internal Server Error – błędy serwera/bazy danych

## 5. Przepływ danych

1. Walidacja parametru `id` (UUID format).
2. Pobranie danych quizu z bazy (docelowo z filtrowaniem po `user_id` użytkownika, obecnie implementacja mockowego filtrowanie po `user_id` = SUPABASE_DEFAULT_USER_ID).
3. Pobranie pytań i odpowiedzi dla quizu.
4. Mapowanie danych na DTO i zwrot odpowiedzi.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie i autoryzacja:** W przyszłości endpoint powinien być zabezpieczony przy użyciu Supabase Auth i RLS. Tylko autoryzowani użytkownicy mogą pobierać swoje quizy. Dla MVP ograniczamy się do filtowania po SUPABASE_DEFAULT_USER_ID.
- **Walidacja wejścia:** UUID validation dla parametru `id`.
- **Izolacja danych:** Query zawsze filtrowane po `user_id` (IDOR prevention).
- **Rejestracja zdarzeń:** Loguj błędy krytyczne w dedykowanym systemie logowania.

## 7. Obsługa błędów

- **Błędy walidacji (400):** Niepoprawny format UUID.
- **Brak zasobu (404):** Quiz nie istnieje lub należy do innego użytkownika.
- **Błąd serwera (500):** Błędy bazy danych lub inne błędy serwerowe.
- Każdy błąd należy rejestrować z dokładnymi informacjami (kod błędu, szczegóły) aby ułatwić debugging.

## 8. Rozważania dotyczące wydajności

- **Optymalizacja zapytań:** Rozważyć JOIN queries zamiast multiple queries dla lepszej wydajności.
- **Indeksy:** Upewnij się, że istnieją odpowiednie indeksy na kluczowych kolumnach.
- **Cache:** Możliwe cacheowanie dla często pobieranych quizów (nieistotne na etapie MVP).
- **Limity czasowe:** Odpowiednie timeouty dla operacji bazodanowych.

## 9. Etapy wdrożenia

1. **Stworzenie walidatora UUID:**
   - Rozszerzenie `src/lib/validators/quiz.validator.ts` o funkcję walidacji UUID.

2. **Implementacja quiz service:**
   - Utworzenie `src/lib/services/quiz.service.ts` z metodą `getQuizById()`.
   - Implementacja zapytań do bazy danych z obsługą błędów.

3. **Implementacja endpointu API:**
   - Utworzenie `src/pages/api/quizzes/[id].ts` z GET handlerem.
   - Integracja walidacji, autoryzacji i service call.

4. **Obsługa autoryzacji i zabezpieczeń:**
   - Integracja z Supabase Auth (na razie z SUPABASE_DEFAULT_USER_ID).
   - Zapewnienie izolacji danych między użytkownikami.

5. **Budowa odpowiedzi API:**
   - Zbudowanie i zwrócenie odpowiedzi z kodem 201 oraz danymi quizu.

6. **Testowanie i optymalizacja:**
   - Unit tests dla service i walidatorów.
   - Integration tests dla endpointu.
   - Performance testing i optymalizacja zapytań.

7. **Logi:**
   - Szczegółowe logowanie akcji i błędów.

```

```
