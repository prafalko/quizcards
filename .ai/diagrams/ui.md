<architecture_analysis>
Na podstawie dostarczonej dokumentacji oraz analizy kodu, zidentyfikowano następujące elementy architektury UI dla modułu uwierzytelniania:

### 1. Komponenty, Strony i Layouty

**Strony (Astro - `src/pages`)**
- `login.astro`: Strona logowania, renderuje komponent `LoginForm`.
- `register.astro`: Strona rejestracji, renderuje komponent `RegisterForm`.
- `recover.astro`: Strona odzyskiwania konta, renderuje `RecoverAccountForm`.
- `index.astro`: Główna strona aplikacji, która przekierowuje do `/login` jeśli użytkownik nie jest zalogowany.

**Layouty (Astro - `src/layouts`)**
- `AuthLayout.astro`: Specjalny, minimalistyczny layout dla stron uwierzytelniania (`login`, `register`, `recover`).
- `Layout.astro`: Główny layout aplikacji, który po zalogowaniu wyświetla dane użytkownika i przycisk wylogowania.

**Komponenty (React - `src/components/auth`)**
- `LoginForm.tsx`: Interaktywny formularz logowania z walidacją, obsługą stanu i komunikacją z API.
- `RegisterForm.tsx`: Interaktywny formularz rejestracji z walidacją, obsługą stanu i komunikacją z API.
- `RecoverAccountForm.tsx`: Formularz do odzyskiwania hasła.
- `AuthFormMessage.tsx`: Komponent do wyświetlania komunikatów o błędach lub sukcesie w formularzach.
- `LogoutButton.tsx` (Planowany): Przycisk do wylogowania użytkownika.

**Middleware (`src/middleware/index.ts`)**
- `Middleware`: Centralny punkt kontroli dostępu. Weryfikuje sesję użytkownika przy każdym żądaniu, chroni trasy i przekierowuje użytkowników w zależności od ich statusu zalogowania.

**API Endpoints (`src/pages/api/auth`)**
- `login.ts`: Endpoint backendowy, który obsługuje logikę logowania po stronie serwera, komunikując się z Supabase.

### 2. Przepływ Danych

1.  Użytkownik wchodzi na chronioną stronę (np. `/`).
2.  `Middleware` przechwytuje żądanie, sprawdza brak aktywnej sesji i przekierowuje użytkownika na stronę `/login`.
3.  Strona `login.astro` używa `AuthLayout.astro` i renderuje komponent `LoginForm.tsx`.
4.  Użytkownik wypełnia formularz w `LoginForm.tsx`. Dane są walidowane po stronie klienta.
5.  Po wysłaniu formularza, `LoginForm.tsx` wysyła żądanie `POST` do endpointu `/api/auth/login.ts` z danymi uwierzytelniającymi.
6.  Endpoint `login.ts` wywołuje `supabase.auth.signInWithPassword()`.
7.  Supabase Auth weryfikuje dane. W przypadku sukcesu, tworzy sesję i zwraca ją do klienta (w postaci cookies). W przypadku błędu, zwraca informację o błędzie.
8.  `LoginForm.tsx` otrzymuje odpowiedź. W przypadku błędu, wyświetla go za pomocą `AuthFormMessage.tsx`. W przypadku sukcesu, przekierowuje użytkownika na stronę główną (`/`).
9.  Przy kolejnym żądaniu do strony `/`, `Middleware` odczytuje sesję z cookies, stwierdza, że użytkownik jest zalogowany i pozwala na dostęp do strony.
10. `Layout.astro` (główny layout) wykrywa aktywną sesję i wyświetla interfejs dla zalogowanego użytkownika (np. przycisk wylogowania).

### 3. Opis Funkcjonalności Komponentów

- **Strony Astro (`.astro`)**: Odpowiadają za routing, strukturę HTML strony oraz integrację komponentów React. Działają po stronie serwera.
- **Layouty Astro (`.astro`)**: Definiują wspólny szkielet dla wielu stron (np. nagłówek, stopka, meta tagi). `AuthLayout` jest uproszczony, a `Layout` jest głównym, dynamicznym layoutem aplikacji.
- **Komponenty React (`.tsx`)**: Zarządzają stanem interfejsu użytkownika, interakcjami (formularze, przyciski), walidacją po stronie klienta i komunikacją z API po stronie klienta.
- **Middleware (`.ts`)**: Działa jako strażnik dla wszystkich żądań do aplikacji. Zarządza sesjami i autoryzacją na poziomie serwera, zanim jakakolwiek strona zostanie wyrenderowana.
- **API Endpoints (`.ts`)**: Logika backendowa uruchamiana na serwerze, odpowiedzialna za bezpieczne operacje, takie jak komunikacja z bazą danych i usługami zewnętrznymi (Supabase).

</architecture_analysis>

<mermaid_diagram>
```mermaid
flowchart TD
    subgraph "Użytkownik Niezalogowany"
        direction LR
        U_START[Start] --> MW_CHECK_NO_SESSION{Middleware: Brak sesji?}
        MW_CHECK_NO_SESSION -- Tak --> REDIRECT_LOGIN[Przekierowanie do /login]
        REDIRECT_LOGIN --> P_LOGIN[Strona: login.astro]
    end

    subgraph "Strony Uwierzytelniania (Astro)"
        P_LOGIN -- Używa --> L_AUTH[Layout: AuthLayout.astro]
        P_LOGIN -- Renderuje --> C_LOGIN_FORM[Komponent: LoginForm.tsx]
        
        P_REGISTER[Strona: register.astro] -- Używa --> L_AUTH
        P_REGISTER -- Renderuje --> C_REGISTER_FORM[Komponent: RegisterForm.tsx]
        
        P_RECOVER[Strona: recover.astro] -- Używa --> L_AUTH
        P_RECOVER -- Renderuje --> C_RECOVER_FORM[Komponent: RecoverAccountForm.tsx]
    end

    subgraph "Interaktywne Formularze (React)"
        C_LOGIN_FORM -- Wprowadza dane --> V_CLIENT[Walidacja klienta (zod)]
        V_CLIENT -- OK --> FETCH_LOGIN[POST /api/auth/login]
        
        C_REGISTER_FORM -- Wprowadza dane --> V_CLIENT_REG[Walidacja klienta (zod)]
        V_CLIENT_REG -- OK --> FETCH_REGISTER[POST /api/auth/register]
        
        FETCH_LOGIN -- Wyświetla błąd/sukces --> C_AUTH_MSG[Komponent: AuthFormMessage.tsx]
        FETCH_REGISTER -- Wyświetla błąd/sukces --> C_AUTH_MSG
        C_RECOVER_FORM
    end

    subgraph "Backend Aplikacji (Astro API)"
        FETCH_LOGIN --> API_LOGIN[Endpoint: login.ts]
        FETCH_REGISTER --> API_REGISTER[Endpoint: register.ts]
        
        API_LOGIN -- Wywołuje --> S_AUTH_SIGNIN[Supabase Auth: signInWithPassword]
        API_REGISTER -- Wywołuje --> S_AUTH_SIGNUP[Supabase Auth: signUp]
    end
    
    subgraph "Usługa Zewnętrzna"
        S_AUTH_SIGNIN <--> SUPABASE[Supabase]
        S_AUTH_SIGNUP <--> SUPABASE
    end

    subgraph "Użytkownik Zalogowany"
        direction LR
        S_AUTH_SIGNIN -- Sukces --> SET_COOKIE[Ustawienie sesji (cookie)]
        SET_COOKIE --> REDIRECT_HOME[Przekierowanie do /]
        REDIRECT_HOME --> P_HOME[Strona: index.astro]
        
        P_HOME -- Żądanie --> MW_CHECK_SESSION{Middleware: Jest sesja?}
        MW_CHECK_SESSION -- Tak --> RENDER_PAGE[Renderuj stronę]
        RENDER_PAGE --> L_MAIN[Layout: Layout.astro]
        L_MAIN -- Renderuje --> C_DASHBOARD[Komponent: Dashboard.tsx]
        L_MAIN -- Wyświetla --> C_LOGOUT[Komponent: LogoutButton.tsx]
    end
    
    classDef astro fill:#FF5E00,stroke:#333,stroke-width:2px,color:#fff;
    classDef react fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000;
    classDef middleware fill:#F7DF1E,stroke:#333,stroke-width:2px,color:#000;
    classDef api fill:#333,stroke:#fff,stroke-width:2px,color:#fff;
    classDef supabase fill:#3ECF8E,stroke:#333,stroke-width:2px,color:#fff;

    class P_LOGIN,P_REGISTER,P_RECOVER,P_HOME,L_AUTH,L_MAIN astro;
    class C_LOGIN_FORM,C_REGISTER_FORM,C_RECOVER_FORM,C_AUTH_MSG,C_DASHBOARD,C_LOGOUT react;
    class MW_CHECK_NO_SESSION,MW_CHECK_SESSION middleware;
    class API_LOGIN,API_REGISTER api;
    class S_AUTH_SIGNIN,S_AUTH_SIGNUP,SUPABASE supabase;
```
</mermaid_diagram>
