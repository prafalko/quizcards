<conversation_summary>
<decisions>
1. Fiszki nie będą przechowywane w osobnej encji – kopia danych fiszki zostanie zapisana bezpośrednio jako pytanie w quizie.
2. Encja „quizzes” będzie powiązana z użytkownikami przez klucz obcy (1-N) oraz „quiz_questions” powiązane z „quizzes” (1-N).
3. Odpowiedzi będą przechowywane w osobnej tabeli „answers” z czterema rekordami na pytanie, z czego jeden oznaczony jako poprawny.
4. Na etapie MVP odświeżenie strony w momencie rozwiązywania quizu powoduje, że quiz jest rozwiązywany od nowa (progres nie jest zapamiętywany).
5. Do identyfikacji rekordów zostaną użyte UUID.
6. Nie przewidujemy obsługi sytuacji zdublowanych instancji przy jednoczesnych aktualizacjach podczas rozwiązywania quizu.
7. W przypadku usunięcia quizu przez użytkownika, quiz zostanie usunięty kaskadowo, nawet jeśli jest w trakcie rozwiązywania.
8. Kolumna `metadata` w tabeli „quiz_questions” będzie dokumentować parametry generacji AI (prompt, model, temperature, seed).
9. Pola tekstowe będą miały ograniczenia długości (np. `question_text` do 2048 znaków, `answer.text` do 512 znaków).
10. Dla operacji usunięcia quizu na etapie MVP nie wdrażamy mechanizmu audit-trail.
</decisions>

<matched_recommendations>
1. Dodanie opcjonalnych kolumn `source_url` i `quizlet_set_id` w „quiz_questions” w celu umożliwienia audytu i ewentualnych ponownych importów.
2. Utrzymanie tabeli „answers” z ograniczeniami zapewniającymi, że dla każdego pytania istnieje dokładnie jeden rekord z `is_correct = true` oraz suma odpowiedzi wynosi cztery.
3. Wprowadzenie kolumny `status` w tabeli „quizzes” do odróżnienia quizów w fazie roboczej od gotowych.
4. Wdrożenie kolumn `created_at` i `updated_at` (z odpowiednimi triggerami aktualizacyjnymi) w tabelach „quiz_questions” i „answers”.
5. Utrzymanie prostoty operacyjnej bez mechanizmów obsługi zdublowanych instancji na etapie MVP.
6. Umożliwienie kaskadowego usuwania quizu, przy czym quiz_progress nie wymaga osobnego traktowania.
7. Stosowanie ograniczenia CHECK dla kolumny `metadata` w „quiz_questions”, które zapewnia spójność danych JSON.
8. Wprowadzenie kontroli długości pól tekstowych: ustawienie TEXT (bez limitu) na start, ale dodanie CHECK length(question_text) ≤ 2048 i length(answer.text) ≤ 512
</matched_recommendations>

<database_planning_summary>
Główne wymagania dotyczące schematu bazy danych obejmują:
- Przechowywanie importowanych fiszek bez dedykowanej encji; dane będą przechowywane jako pytania w quizie.
- Powiązanie między użytkownikami, quizami, pytaniami oraz odpowiedziami przy użyciu odpowiednich kluczy obcych i UUID.
- Przechowywanie czterech odpowiedzi na pytanie przy zachowaniu ograniczenia, że tylko jedna z nich jest poprawna.
- Brak zapisu progresu – w momencie odświeżenia strony w trakcie rozwiązywania quizu, quiz rozwiązywany jest od nowa.
- Zachowanie prostoty operacyjnej z uwzględnieniem kaskadowego usuwania rekordów i braku zaawansowanej obsługi zdublowanych instancji.
- Wprowadzenie kolumn takich jak `metadata` w „quiz_questions” do przechowywania parametrów AI wraz z kontrolą poprawności struktury JSON.
- Dodanie ograniczeń długości dla pól tekstowych celem bezpieczeństwa, a także timestamp’ów dla śledzenia zmian.
- Na ten moment nie wdrożony zostanie mechanizm audit-trail przy usunięciach quizów, co uniemożliwi ewentualne przywrócenie danych.
Kluczowe encje to:
- `users` – przechowywanie danych użytkowników (obsługiwane przez Supabase).
- `quizzes` – dane quizu, powiązane z użytkownikiem.
- `quiz_questions` – pytania quizowe, zawierające kopię treści fiszki, kolumny `source_url`/`quizlet_set_id` opcjonalnie oraz `metadata`.
- `answers` – odpowiedzi do pytania z kluczem wskazującym, która jest poprawna.
Relacje są ustalone jako 1-N między użytkownikami a quizami oraz quizami a pytaniami i odpowiedziami, a mechanizmy RLS umożliwiają widoczność danych tylko dla właściwego użytkownika.
Kwestie bezpieczeństwa uwzględniają m.in. stosowanie RLS z polityką, która zapewnia, że użytkownik ma dostęp tylko do swoich rekordów, a także ograniczenia strukturalne w kolumnach JSON i restrykcyjne kontrole długości pól.
Skalowalność została rozważona głównie pod kątem użycia UUID oraz prostych indeksów – partycjonowanie nie jest planowane dla MVP.
</database_planning_summary>

<unresolved_issues>
Obecnie nie ma nierozwiązanych kwestii ani obszarów wymagających dalszego wyjaśnienia.
</unresolved_issues>
</conversation_summary>