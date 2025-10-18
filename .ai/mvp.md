# Aplikacja - QuizCards (MVP)

### Główny problem
Quizlet ma opcję tworzenia quizów, ale fałszywymi odpowiedziami są odpowiedzi z innych fiszek. Najczęśniej zupełnie nie pasują do kontekstu i powoduje, że narzędzie nie nadaje się do użycia w przypadku posiadania zróżnicowanych fiszek w zestawie.

### Najmniejszy zestaw funkcjonalności
- Generowanie przez AI quizu (zestawu pytań testowych abcd) na podstawie zadanego zestawu fiszek z Quizlet.com (link do publicznego quizu)
- Quiz zawiera pytanie i prawidłową odpowiedź z fiszek, ale AI wymyśla 3 fałszywe odpowiedzi pasujące do kontekstu pytania
- Przeglądanie, edycja i usuwanie quizów i poszczególnych pytań
- Prosty system kont użytkowników do przechowywania quizów
- Interfejs rozwiązywania quizów przez użytkowanika wraz z podsumowaniem wyniku

### Co NIE wchodzi w zakres MVP
- Przechowywanie wyników rozwiązanych quizów
- Powiązanie z kontem Quizlet (np. w celu importu prywatnych quizów lub wyboru quizu z zasobów użytkownika)
- Import fiszek z innych źródeł web lub z załączanych plików (APKG, PDF, DOCX, TXT itp.)
- Współdzielenie quizów między użytkownikami
- Integracje z innymi platformami edukacyjnymi
- Aplikacje mobilne (na początek tylko web)

### Kryteria sukcesu
- 75% wygenerowanych przez AI pytań jest akceptowane przez użytkownika
- 75% pytań w quizach jest generowanie przez AI
