# Specyfikacja Techniczna: Moduł Uwierzytelniania w QuizCards

## 1. Przegląd

Niniejszy dokument opisuje architekturę i plan implementacji modułu uwierzytelniania użytkowników (rejestracja, logowanie, wylogowanie) w aplikacji QuizCards. Rozwiązanie opiera się na wymaganiach zdefiniowanych w PRD (US-001, US-002, US-003) oraz na stacku technologicznym projektu (Astro, React, Supabase).

## 2. Architektura Interfejsu Użytkownika (Frontend)

Logika interfejsu zostanie podzielona między strony Astro (odpowiedzialne za routing i renderowanie szkieletu) oraz komponenty React (odpowiedzialne za interaktywne formularze).

### 2.1. Strony (Astro)

-   **`src/pages/login.astro` (Nowa)**: Strona logowania.
    -   Renderuje komponent React `LoginForm.tsx`.
    -   Używa `AuthLayout.astro`.
    -   Dostępna tylko dla niezalogowanych użytkowników (middleware obsłuży przekierowanie).

-   **`src/pages/register.astro` (Nowa)**: Strona rejestracji.
    -   Renderuje komponent React `RegisterForm.tsx`.
    -   Używa `AuthLayout.astro`.
    -   Dostępna tylko dla niezalogowanych użytkowników.

### 2.2. Layouty (Astro)

-   **`src/layouts/AuthLayout.astro` (Nowy)**:
    -   Minimalistyczny layout dla stron `login` i `register`.
    -   Zawiera podstawową strukturę HTML i branding, bez elementów nawigacyjnych dla zalogowanego użytkownika.

-   **`src/layouts/Layout.astro` (Modyfikacja)**:
    -   Główny layout aplikacji zostanie rozszerzony o logikę warunkowego renderowania.
    -   Na podstawie danych sesji z `Astro.locals`, będzie wyświetlał w nagłówku informacje o użytkowniku i przycisk `LogoutButton.tsx`.

### 2.3. Komponenty (React)

Komponenty zostaną umieszczone w nowym katalogu `src/components/auth/`.

-   **`src/components/auth/LoginForm.tsx` (Nowy)**:
    -   Formularz z polami na e-mail i hasło.
    -   Walidacja po stronie klienta za pomocą `zod` i `react-hook-form`.
    -   Wywołuje `supabase.auth.signInWithPassword()` po submisji.
    -   Obsługuje i wyświetla błędy z API.
    -   Przekierowuje na stronę główną (`/`) po udanym logowaniu.

-   **`src/components/auth/RegisterForm.tsx` (Nowy)**:
    -   Formularz z polami na e-mail, hasło i jego potwierdzenie.
    -   Walidacja klienta (jak wyżej + sprawdzanie zgodności haseł).
    -   Wywołuje `supabase.auth.signUp()`.
    -   Wyświetla komunikaty o sukcesie i błędach.
    -   Przekierowuje na stronę główną (`/`) po udanej rejestracji, zgodnie z US-001.

-   **`src/components/auth/LogoutButton.tsx` (Nowy)**:
    -   Przycisk wywołujący `supabase.auth.signOut()`.
    -   Przekierowuje na stronę `/login` po wylogowaniu.

## 3. Logika Backendowa

### 3.1. Middleware (Astro)

-   **`src/middleware/index.ts` (Modyfikacja/Utworzenie)**:
    -   Centralny punkt kontroli dostępu.
    -   Używa `createServerClient` z `@supabase/auth-helpers-astro` do weryfikacji sesji na podstawie cookies z każdego żądania.
    -   Przechowuje dane sesji i użytkownika w `Astro.locals`, udostępniając je na potrzeby renderowania po stronie serwera.
    -   Definiuje listę ścieżek publicznych (`/login`, `/register`, `/api/auth/**`) i chronionych (wszystkie pozostałe).
    -   Przekierowuje niezalogowanych użytkowników z chronionych stron na `/login`.
    -   Przekierowuje zalogowanych użytkowników ze stron `/login`, `/register` na `/`.

### 3.2. Endpointy API (Astro)

-   **`src/pages/api/auth/callback.ts` (Nowy)**:
    -   Endpoint wymagany przez `@supabase/auth-helpers-astro` do obsługi przepływu `PKCE` (Proof Key for Code Exchange).
    -   Bezpiecznie wymienia kod autoryzacyjny na sesję użytkownika po stronie serwera.

### 3.3. Modyfikacja Warstwy Danych

-   **`src/lib/services/quiz.service.ts` (Modyfikacja)**:
    -   Metody takie jak `getQuizzes`, `createQuiz`, `deleteQuiz` muszą zostać zaktualizowane, aby przyjmować `userId` jako argument i filtrować/zapisywać dane w kontekście zalogowanego użytkownika.
-   **Strony SSR (np. `src/pages/index.astro`) (Modyfikacja)**:
    -   Będą pobierać ID użytkownika z `Astro.locals.user.id` i przekazywać je do serwisów w celu pobrania danych specyficznych dla użytkownika.

## 4. System Uwierzytelniania i Baza Danych

### 4.1. Konfiguracja Supabase

-   **Dostawca**: W panelu Supabase zostanie włączony i skonfigurowany dostawca uwierzytelniania "Email".
-   **Potwierdzenie E-mail**: Opcja "Confirm email" zostanie włączona w celu weryfikacji adresów e-mail użytkowników. Zgodnie z US-001, nie będzie to blokowało pierwszego logowania – użytkownik zostanie zalogowany i przekierowany do aplikacji od razu po rejestracji. Aplikacja może w przyszłości zachęcać do potwierdzenia adresu e-mail.

### 4.2. Zmiany w Schemacie Bazy Danych

-   **Tabela `quizzes`**:
    -   Zostanie dodana nowa kolumna `user_id` (typu `uuid`), która będzie kluczem obcym do tabeli `auth.users`.
    -   Ta zmiana zostanie wprowadzona za pomocą nowej migracji w katalogu `supabase/migrations/`.

### 4.3. Row Level Security (RLS)

-   **Aktywacja**: RLS zostanie włączone dla tabel `quizzes`, `questions` i `answers`.
-   **Polityki dla `quizzes`**:
    -   `SELECT`, `INSERT`, `UPDATE`, `DELETE`: Dozwolone tylko dla wierszy, gdzie `quizzes.user_id` jest równe `auth.uid()`.
-   **Polityki dla `questions` i `answers`**:
    -   Dostęp będzie uzależniony od posiadania dostępu do nadrzędnego quizu. Reguła będzie weryfikować, czy `auth.uid()` jest właścicielem quizu, z którym powiązane jest pytanie/odpowiedź, np. poprzez `EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id)`.
