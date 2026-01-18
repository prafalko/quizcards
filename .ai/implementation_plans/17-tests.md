# Plan Testów dla Aplikacji QuizCards

## 1. Wprowadzenie i cele testowania

### 1.1. Wprowadzenie

Niniejszy dokument opisuje kompleksowy plan testów dla aplikacji QuizCards. Celem jest zapewnienie wysokiej jakości, stabilności i bezpieczeństwa aplikacji przed jej wdrożeniem na środowisko produkcyjne. Plan obejmuje różne poziomy i typy testów, dostosowane do architektury projektu i wykorzystywanych technologii, takich jak Astro, React, Supabase oraz integracje z zewnętrznymi API (Quizlet, Gemini AI).

### 1.2. Cele testowania

- **Weryfikacja funkcjonalna:** Upewnienie się, że wszystkie funkcjonalności aplikacji działają zgodnie ze specyfikacją i wymaganiami.
- **Zapewnienie jakości kodu:** Identyfikacja i eliminacja błędów w kodzie na wczesnym etapie rozwoju.
- **Gwarancja stabilności i wydajności:** Sprawdzenie, czy aplikacja działa stabilnie pod obciążeniem i zapewnia odpowiednią szybkość działania.
- **Zapewnienie bezpieczeństwa:** Weryfikacja, czy dane użytkowników są chronione i czy aplikacja jest odporna na podstawowe ataki.
- **Walidacja integracji:** Sprawdzenie poprawności komunikacji z zewnętrznymi usługami (Quizlet, Gemini AI, Supabase).
- **Zapewnienie dobrego User Experience:** Weryfikacja, czy interfejs użytkownika jest intuicyjny, spójny i wolny od błędów wizualnych.

## 2. Zakres testów

### 2.1. Funkcjonalności objęte testami

- Moduł autentykacji (rejestracja, logowanie, wylogowywanie, odzyskiwanie konta).
- Panel główny (Dashboard) z listą quizów.
- Proces tworzenia quizu (z linku Quizlet i z tekstu).
- Zarządzanie quizem (edycja nazwy, usuwanie).
- Edytor pytań i odpowiedzi (dodawanie, edytowanie, usuwanie, regeneracja odpowiedzi AI).
- Proces rozwiązywania quizu (rozgrywka).
- Ekran wyników i podsumowania.
- Ochrona tras i autoryzacja dostępu do zasobów.

### 2.2. Funkcjonalności wyłączone z testów

- Testy wydajnościowe na dużą skalę (load testing) - na tym etapie nie są priorytetem.
- Testy A/B interfejsu użytkownika.
- Szczegółowe testy kompatybilności ze starszymi lub niszowymi przeglądarkami.

## 3. Typy testów do przeprowadzenia

- **Testy statyczne (Static Testing):**
  - **Linting:** Użycie ESLint i TypeScript do statycznej analizy kodu w celu wyłapywania błędów, niespójności i potencjalnych problemów przed uruchomieniem aplikacji.
- **Testy jednostkowe (Unit Tests):**
  - **Cel:** Weryfikacja małych, izolowanych fragmentów kodu (funkcje, hooki, komponenty React) w oderwaniu od zależności.
  - **Zakres:** Serwisy w `src/lib/services`, walidatory w `src/lib/validators`, hooki w `src/components/hooks` oraz kluczowe komponenty React. Zależności (np. Supabase SDK, AI SDK) będą mockowane.
- **Testy integracyjne (Integration Tests):**
  - **Cel:** Sprawdzenie poprawności współpracy między różnymi modułami aplikacji.
  - **Zakres:** Testowanie endpointów API (`src/pages/api`) w połączeniu z logiką serwisów i interakcją z **testową bazą danych Supabase**. Sprawdzenie, czy operacje CRUD poprawnie modyfikują stan bazy danych.
- **Testy End-to-End (E2E Tests):**
  - **Cel:** Symulacja rzeczywistych scenariuszy użycia aplikacji z perspektywy użytkownika w przeglądarce.
  - **Zakres:** Pełne ścieżki użytkownika, od rejestracji po usunięcie quizu. Weryfikacja przepływu danych między frontendem a backendem.
- **Testy kontraktowe (Contract Tests):**
  - **Cel:** Weryfikacja, czy integracja z zewnętrznymi API (Quizlet, Gemini) działa zgodnie z oczekiwaniami i czy format danych nie uległ zmianie.
  - **Zakres:** Okresowe uruchamianie testów na środowisku CI, które komunikują się z prawdziwymi API w celu weryfikacji kontraktu.
- **Testy wizualnej regresji (Visual Regression Testing):**
  - **Cel:** Wykrywanie niezamierzonych zmian w interfejsie użytkownika.
  - **Zakres:** Kluczowe widoki aplikacji (Dashboard, widok gry, edytor) w celu zapewnienia spójności wizualnej.
- **Testy manualne (Manual Testing):**
  - **Cel:** Eksploracyjne testowanie aplikacji w celu znalezienia błędów, które trudno wykryć automatycznie, oraz ocena ogólnego UX.
  - **Zakres:** Ocena jakości pytań generowanych przez AI, weryfikacja intuicyjności interfejsu.

## 4. Scenariusze testowe dla kluczowych funkcjonalności

| Funkcjonalność         | Scenariusz                                                                                         | Typ testu              | Priorytet |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ---------------------- | --------- |
| **Rejestracja**        | Użytkownik podaje poprawne dane i tworzy konto.                                                    | E2E, Integracyjny      | Krytyczny |
|                        | Użytkownik podaje niepoprawny email / hasło i widzi błąd walidacji.                                | E2E, Jednostkowy       | Krytyczny |
|                        | Użytkownik próbuje zarejestrować się na istniejący email.                                          | E2E, Integracyjny      | Krytyczny |
| **Logowanie**          | Użytkownik podaje poprawne dane i zostaje zalogowany.                                              | E2E, Integracyjny      | Krytyczny |
|                        | Użytkownik podaje błędne dane i widzi komunikat o błędzie.                                         | E2E, Jednostkowy       | Krytyczny |
| **Tworzenie quizu**    | Zalogowany użytkownik tworzy quiz z publicznego linku Quizlet.                                     | E2E, Integracyjny      | Wysoki    |
|                        | Zalogowany użytkownik tworzy quiz na podstawie wklejonego tekstu.                                  | E2E, Integracyjny      | Wysoki    |
|                        | Użytkownik podaje niepoprawny link Quizlet i widzi błąd.                                           | E2E, Jednostkowy       | Średni    |
|                        | Integracja z Gemini AI zwraca błąd podczas generowania pytań.                                      | Integracyjny           | Wysoki    |
| **Edycja quizu**       | Użytkownik zmienia tytuł quizu.                                                                    | E2E, Integracyjny      | Wysoki    |
|                        | Użytkownik dodaje nowe pytanie z odpowiedziami.                                                    | E2E, Integracyjny      | Wysoki    |
|                        | Użytkownik edytuje istniejące pytanie/odpowiedź.                                                   | E2E, Integracyjny      | Wysoki    |
|                        | Użytkownik usuwa pytanie.                                                                          | E2E, Integracyjny      | Wysoki    |
|                        | Użytkownik próbuje edytować quiz, który do niego nie należy.                                       | Integracyjny, E2E      | Krytyczny |
| **Rozgrywka i wyniki** | Użytkownik przechodzi cały quiz, odpowiadając na pytania.                                          | E2E                    | Wysoki    |
|                        | Użytkownik kończy quiz i widzi ekran wyników z poprawnym podsumowaniem.                            | E2E, Integracyjny      | Wysoki    |
| **API**                | Endpointy API zwracają błąd 401 dla niezalogowanego użytkownika.                                   | Integracyjny           | Krytyczny |
|                        | Endpointy API zwracają błąd 403 przy próbie dostępu do cudzych zasobów.                            | Integracyjny           | Krytyczny |
|                        | Endpointy API poprawnie walidują dane wejściowe (np. za krótkie hasło, niepoprawny format danych). | Integracyjny, Jednost. | Krytyczny |

## 5. Środowisko testowe

- **Środowisko lokalne:** Programiści uruchamiają testy jednostkowe i integracyjne lokalnie przed wypchnięciem zmian do repozytorium.
- **Środowisko CI (Continuous Integration):**
  - Serwer: GitHub Actions.
  - Baza danych: Dedykowana, odizolowana instancja Supabase dla celów testowych. Baza danych będzie resetowana przed każdym przebiegiem testów E2E i integracyjnych.
  - Zmienne środowiskowe: Osobne klucze API dla usług (Supabase, Gemini) na potrzeby testów.

## 6. Narzędzia do testowania

- **Test runner:** Vitest (dla testów jednostkowych i integracyjnych).
- **Framework E2E:** Playwright.
- **Biblioteka do testowania komponentów:** React Testing Library.
- **Mockowanie:** `vi.mock` z Vitest.
- **Asersje:** `expect` (wbudowane w Vitest).
- **Testy wizualnej regresji:** Playwright.
- **CI/CD:** GitHub Actions.

## 7. Harmonogram testów

- **Faza 1: Refaktoryzacja i implementacja testów jednostkowych i integracyjnych (Sprint 1-2):**
  - Przegląd i refaktoryzacja istniejących testów w `src/test`.
  - Stworzenie solidnego pokrycia testami jednostkowymi dla serwisów i walidatorów.
  - Implementacja testów integracyjnych dla wszystkich endpointów API.
  - Konfiguracja pipeline'u CI na GitHub Actions.
- **Faza 2: Implementacja testów E2E (Sprint 3):**
  - Stworzenie kluczowych scenariuszy E2E dla głównych przepływów w aplikacji.
- **Faza 3: Testy regresji i manualne (Przed każdym wdrożeniem):**
  - Uruchomienie pełnego zestawu testów automatycznych.
  - Przeprowadzenie testów eksploracyjnych i weryfikacja jakości generowanych quizów.

## 8. Kryteria akceptacji testów

- **Kryteria wejścia (rozpoczęcia testów):**
  - Kod został zintegrowany z głównym branchem.
  - Aplikacja została pomyślnie zbudowana i wdrożona na środowisku testowym.
- **Kryteria wyjścia (zakończenia testów):**
  - 100% testów automatycznych (jednostkowych, integracyjnych, E2E) przechodzi pomyślnie.
  - Pokrycie kodu testami jednostkowymi i integracyjnymi wynosi co najmniej 80% dla kluczowych modułów (API, serwisy).
  - Wszystkie zidentyfikowane błędy krytyczne i wysokie zostały naprawione i zweryfikowane.
  - Dokumentacja testowa została zaktualizowana.

## 9. Role i odpowiedzialności w procesie testowania

- **Developerzy:**
  - Odpowiedzialni za pisanie testów jednostkowych i integracyjnych dla tworzonych przez siebie funkcjonalności.
  - Naprawianie błędów znalezionych podczas wszystkich faz testów.
  - Utrzymywanie i aktualizacja testów.
- **Inżynier QA (Rola w tym zadaniu):**
  - Tworzenie i utrzymanie planu testów.
  - Projektowanie i implementacja testów E2E i kontraktowych.
  - Przeprowadzanie testów manualnych i eksploracyjnych.
  - Zarządzanie procesem raportowania błędów.
  - Ostateczna akceptacja funkcjonalności przed wdrożeniem.

## 10. Procedury raportowania błędów

Wszystkie znalezione błędy będą raportowane jako "Issues" w repozytorium GitHub projektu. Każdy raport powinien zawierać:

- **Tytuł:** Krótki, zwięzły opis błędu.
- **Opis:**
  - Kroki do reprodukcji błędu.
  - Oczekiwany rezultat.
  - Rzeczywisty rezultat.
- **Środowisko:** Wersja przeglądarki, system operacyjny.
- **Priorytet:**
  - **Krytyczny (Critical):** Blokuje kluczowe funkcjonalności, uniemożliwia dalsze testy.
  - **Wysoki (High):** Poważny błąd funkcjonalny, który ma duży wpływ na użyteczność.
  - **Średni (Medium):** Błąd, który ma mniejszy wpływ na działanie, ale jest zauważalny dla użytkownika.
  - **Niski (Low):** Błąd kosmetyczny, literówka, drobny problem z UI.
- **Załączniki:** Zrzuty ekranu, nagrania wideo, logi z konsoli.

Błędy będą przypisywane do odpowiednich programistów, a ich status będzie śledzony w ramach tablicy projektu GitHub.
