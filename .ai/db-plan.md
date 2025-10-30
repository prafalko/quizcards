# Schemat bazy danych PostgreSQL dla QuizCards

## 1. Lista Tabel

### 1.1. users

This table is managed by Supabase Auth.

- id: UUID PRIMARY KEY (np. generowany przez pgcrypto)
- login: VARCHAR(255) NOT NULL UNIQUE
- password_hash: VARCHAR NOT NULL
- created_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
- updated_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()

### 1.2. quizzes

- id: UUID PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- source_url: TEXT NULL -- opcjonalny URL źródłowy
- quizlet_set_id: VARCHAR(255) NULL -- opcjonalny identyfikator zestawu Quizlet
- title: VARCHAR(255) NOT NULL
- status: VARCHAR(50) NOT NULL DEFAULT 'draft' -- status quizu, np. 'draft' lub 'published'
- created_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
- updated_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()

### 1.3. quiz_questions

- id: UUID PRIMARY KEY
- quiz_id: UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE
- question_text: TEXT NOT NULL CHECK (char_length(question_text) <= 2048)
- metadata: JSONB NOT NULL CHECK (jsonb_typeof(metadata) = 'object') -- parametry generacji AI (prompt, model, temperature, seed)
- created_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
- updated_at: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()

### 1.4. answers

- id: UUID PRIMARY KEY
- question_id: UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE
- answer_text: TEXT NOT NULL CHECK (char_length(answer_text) <= 512)
- is_correct: BOOLEAN NOT NULL DEFAULT FALSE
- source: VARCHAR(20) NOT NULL DEFAULT 'provided' CHECK (source in ('provided', 'manual', 'ai', 'ai-edited'))


## 2. Relacje między tabelami

- Jeden użytkownik (users) może mieć wiele quizów (quizzes): relacja jeden-do-wielu (users.id -> quizzes.user_id).
- Jeden quiz (quizzes) składa się z wielu pytań (quiz_questions): relacja jeden-do-wielu (quizzes.id -> quiz_questions.quiz_id).
- Jedno pytanie (quiz_questions) posiada wiele odpowiedzi (answers): relacja jeden-do-wielu (quiz_questions.id -> answers.question_id).

Dodatkowa zasada: Każde pytanie powinno mieć dokładnie 4 odpowiedzi, z czego dokładnie jedna posiada flagę is_correct ustawioną na TRUE. Wymuszenie tego ograniczenia może wymagać dodatkowej logiki w aplikacji lub triggerów w bazie danych.

## 3. Indeksy

- Indeks na kolumnie quizzes.user_id dla szybszego wyszukiwania quizów użytkownika.
- Indeks na kolumnie quiz_questions.quiz_id dla szybszego wyszukiwania pytań quizu.
- Indeks na kolumnie answers.question_id dla szybszego wyszukiwania odpowiedzi pytania.
- Unikalny indeks częściowy dla zapewnienia, że dla danego pytania jest tylko jedna odpowiedź z is_correct = TRUE:
  CREATE UNIQUE INDEX unique_correct_answer ON answers(question_id) WHERE is_correct = TRUE;

## 4. Zasady PostgreSQL (RLS)

Dla tabel związanych z danymi użytkownika (głównie quizzes) zaleca się wdrożenie mechanizmów Row-Level Security (RLS):

- Włączyć RLS na tabeli quizzes.
- Stworzyć politykę, która umożliwia użytkownikowi dostęp tylko do quizów, gdzie quizzes.user_id odpowiada identyfikatorowi aktualnie zalogowanego użytkownika. Przykład polityki:

  ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY user_quiz_policy ON quizzes
  USING (user_id = current_setting('app.current_user_id')::uuid);

Polityki RLS dla quiz_questions i answers mogą być zaimplementowane pośrednio przez połączenie z tabelą quizzes.

## 5. Dodatkowe Uwagi

- Schemat został zaprojektowany według zasad 3NF, z klarownym oddzieleniem encji i relacjami jeden-do-wielu.
- Timestampy (created_at, updated_at) umożliwiają audyt zmian oraz wsparcie dla mechanizmów synchronizacji.
- Ograniczenia długości pól tekstowych zapewniają bezpieczeństwo i integralność danych.
- Mechanizm zapewniający dokładnie 4 odpowiedzi oraz tylko jedną poprawną odpowiedź wymaga dodatkowej walidacji poza poziomem samej bazy (poprzez logikę aplikacyjną lub wykorzystanie triggerów).
