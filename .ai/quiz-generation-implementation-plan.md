```markdown
# API Endpoint Implementation Plan: Create Quiz from Quizlet URL

## 1. Przegląd punktu końcowego
Endpoint ma za zadanie importowanie fiszek z publicznego zestawu Quizlet na podstawie podanego URL i generowanie quizu z wykorzystaniem AI do utworzenia niepoprawnych odpowiedzi. Po udanym przetworzeniu, quiz jest zapisywany w bazie i zwracany użytkownikowi.

## 2. Szczegóły żądania
- **Metoda HTTP:** POST  
- **Ścieżka URL:** `/api/quizzes/generate`  
- **Parametry:**
  - **Wymagane w treści:**  
    - `source_url`: pełny adres URL zestawu Quizlet  
  - **Opcjonalne w treści:**  
    - `title`: niestandardowy tytuł quizu (jeśli nie podany, domyślnie użyty zostanie tytuł z zestawu Quizlet)  
- **Treść żądania (Request Body):**
  ```json
  {
    "source_url": "https://quizlet.com/123456789/biology-quiz-flash-cards/",
    "title": "My Biology Quiz" // opcjonalne
  }
  ```

## 3. Wykorzystywane typy
- **Command/DTO zdefiniowane w `src/types.ts`:**
  - `CreateQuizCommand` – do walidacji wejściowych danych (linia 93-96)
  - `QuizSummaryDTO` - do wyświetlenia odpowiedzi jako podstawowe informacje o quizie bez konkretnych pytań i odpowiedzi zawartych w quizie
- Upewnij się, że typy używane w odpowiedzi spełniają wymagania: `id`, `title`, `status`, `source_url`, `quizlet_set_id`, `question_count`, `created_at`, `updated_at`.

## 4. Szczegóły odpowiedzi
- **Sukces (201 Created):**
  ```json
  {
    "id": "uuid",
    "title": "Biology Flashcards Quiz",
    "status": "published",
    "source_url": "https://quizlet.com/...",
    "quizlet_set_id": "123456789",
    "question_count": 25,
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-01-20T10:00:00Z"
  }
  ```
- **Kody statusu błędów:**
  - 400 Bad Request – niepoprawny format URL lub brakujący `source_url`
  - 403 Forbidden – zestaw Quizlet jest prywatny
  - 404 Not Found – zestaw Quizlet nie istnieje
  - 422 Unprocessable Entity – zestaw Quizlet jest pusty (brak fiszek)
  - 500 Internal Server Error – awaria podczas generacji odpowiedzi przez AI

## 5. Przepływ danych
1. Po otrzymaniu żądania, dane wejściowe są walidowane przy użyciu `zod` (lub innego walidatora) zgodnie z `CreateQuizCommand`.  
2. Pobieranie danych z Quizlet:
   - Parsowanie URL oraz ekstrakcja `quizlet_set_id`
   - Zapytanie do Quizlet API lub parsowanie strony HTML w celu pobrania fiszek
3. Wywołanie usługi AI do generowania niepoprawnych odpowiedzi dla każdego pytania.  
4. Zapis danych quizu w bazie danych (w tabeli `quizzes`) z przypisaniem `user_id` (pobranym z kontekstu uwierzytelniania) oraz ustawieniem statusu na `published`.  
5. Zwrot odpowiedzi z danymi quizu.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie i autoryzacja:** Endpoint powinien być zabezpieczony przy użyciu Supabase Auth. Tylko autoryzowani użytkownicy mogą inicjować generacje.
- **Walidacja wejścia:** Używaj silnej walidacji (np. `zod`) dla `source_url` – upewnij się, że URL jest prawidłowego formatu.
- **Bezpieczeństwo zewnętrznych połączeń:** Zastosuj timeouty przy pobieraniu danych z Quizlet.
- **Rejestracja zdarzeń:** Loguj błędy krytyczne w dedykowanym systemie logowania.

## 7. Obsługa błędów
- **Błędy walidacji (400):** Brak lub niepoprawny format `source_url`.
- **Błędy dostępu (403):** Quizlet set jest prywatny.
- **Brak zasobu (404):** Quizlet set nie został odnaleziony.
- **Błąd nieprzetwarzalny (422):** Quizlet set nie zawiera fiszek.
- **Błąd serwera (500):** Niepowodzenie generacji AI lub inne błędy serwerowe.
- Każdy błąd należy rejestrować z dokładnymi informacjami (kod błędu, szczegóły) aby ułatwić debugging.

## 8. Rozważania dotyczące wydajności
- **Asynchroniczność:** Upewnij się, że operacje pobierania danych z Quizlet i generowania za pomocą AI są asynchroniczne, aby nie blokowały głównego wątku.
- **Limity czasowe:** Ustawienie odpowiednich timeoutów dla zewnętrznych połączeń (Quizlet - 10s, AI - 60s).

## 9. Etapy wdrożenia
1. **✅ Stworzenie walidatora wejściowego:**  
   - ✅ Implementacja schematu walidacji dla `CreateQuizCommand` przy użyciu `zod` w `src/lib/validators/quiz.validator.ts`.
   - ✅ Walidacja URL Quizlet (format, domena, struktura).
   - ✅ Walidacja opcjonalnego tytułu (min 1, max 200 znaków).

2. **✅ Obsługa autoryzacji i zabezpieczeń:**  
   - ✅ Na etapie developmentu użyj stałego `user-id` = "f5c634b6-400f-462e-b7df-d942e33a1d1b".
   - W przyszłości, docelowo będziemy pobierać `user_id` z kontekstu autoryzacji i weryfikować użytkownika przed wykonaniem operacji przez Supabase Auth.

3. **✅ Implementacja logiki pobierania fiszek z Quizlet:**  
   - ✅ Na etapie developmentu stworzymy mocki w `src/lib/services/quizlet.service.ts`.
   - ✅ Funkcja `extractQuizletSetId()` do ekstrakcji ID z URL.
   - ✅ Funkcja `fetchQuizletSet()` z mockami dla różnych scenariuszy (not found, private, empty, success).
   - W przyszłości, docelowo będziemy ekstrahować `quizlet_set_id`, pobierać fiszeki przy pomocy scrappera, wraz z obsługą wyjątków (prywatny zestaw, brak danych).

4. **Integracja z usługą AI:** 
   - Na etapie developmentu stowrzymy mocka zwracającego zawsze te same odpowiedzi, zamiast faktycznego wywoływania serwisu AI.
   - W przyszłości, docelowo będziemy odwoływać się do usługi AI w celu qygenerowania niepoprawnych odpowiedzi wraz z obsługą błędów.

5. **Zapis do bazy danych:**  
   - Utworzenie rekordu quizu w tabeli `quizzes` z odpowiednimi danymi.
   - Ustawienie statusu na `published`.

6. **Budowa odpowiedzi API:**  
   - Zbudowanie i zwrócenie odpowiedzi z kodem 201 oraz danymi quizu.

7. **Logi:**  
   - Szczegółowe logowanie akcji i błędów.

```

