# Dokument wymagań produktu (PRD) - QuizCards

## 1. Przegląd produktu

QuizCards to aplikacja internetowa zaprojektowana do generowania quizów wielokrotnego wyboru (ABCD) na podstawie publicznych zestawów fiszek z serwisu Quizlet.com. Aplikacja wykorzystuje sztuczną inteligencję do tworzenia trzech wiarygodnych, ale nieprawidłowych odpowiedzi, które pasują do kontekstu pytania z fiszki. Użytkownicy mogą tworzyć konta, zarządzać swoimi quizami (przeglądać, edytować, usuwać), a następnie rozwiązywać je w prostym interfejsie. Na koniec quizu prezentowane jest podsumowanie z wynikiem.

## 2. Problem użytkownika

Standardowa funkcja generowania quizów w Quizlet tworzy nieprawidłowe odpowiedzi, używając treści z innych, zupełnie niezwiązanych fiszek w zestawie. Prowadzi to do pytań, w których fałszywe odpowiedzi są łatwe do zidentyfikowania, ponieważ nie pasują do kontekstu pytania. To obniża wartość edukacyjną quizu i sprawia, że narzędzie staje się nieefektywne, zwłaszcza przy zróżnicowanych tematycznie zestawach fiszek. QuizCards rozwiązuje ten problem, generując fałszywe odpowiedzi, które są tematycznie powiązane z pytaniem, tworząc bardziej wymagające i wartościowe narzędzie do nauki.

## 3. Wymagania funkcjonalne

- F-01: System kont użytkowników: Użytkownicy muszą mieć możliwość rejestracji i logowania za pomocą adresu login i hasła.
- F-02: Przechowywanie danych: Quizy utworzone przez użytkownika muszą być powiązane z jego kontem i bezpiecznie przechowywane.
- F-03: Import z Quizlet: Aplikacja musi umożliwiać import fiszek z publicznego zestawu Quizlet na podstawie podanego adresu URL.
- F-04: Generowanie quizu przez AI: Na podstawie zaimportowanych fiszek, system ma generować pytania quizowe. Każde pytanie powinno składać się z treści pytania (z jednej strony fiszki), poprawnej odpowiedzi (z drugiej strony fiszki) oraz trzech nieprawidłowych, ale kontekstowo pasujących odpowiedzi wygenerowanych przez AI.
- F-05: Zarządzanie quizami: Użytkownik musi mieć dostęp do listy wszystkich swoich quizów, z możliwością ich przeglądania, edycji i usuwania.
- F-06: Edycja quizu: Użytkownik musi mieć możliwość edycji tytułu quizu.
- F-07: Zarządzanie pytaniami: Użytkownik musi mieć możliwość edycji treści pytania i odpowiedzi, usuwania poszczególnych pytań oraz ponownego generowania odpowiedzi przez AI dla wybranego pytania.
- F-08: Interfejs rozwiązywania quizu: Aplikacja musi udostępniać interfejs do rozwiązywania quizu, który prezentuje jedno pytanie na raz. Kolejność pytań i odpowiedzi powinna być losowa.
- F-09: Podsumowanie wyników: Po zakończeniu quizu, użytkownikowi musi zostać wyświetlone podsumowanie zawierające wynik procentowy oraz listę wszystkich pytań z zaznaczeniem poprawnych, błędnych oraz udzielonych przez użytkownika odpowiedzi.
- F-10: Obsługa błędów: System musi informować użytkownika o błędach, np. przy próbie importu prywatnego lub nieistniejącego zestawu fiszek.
- F-11: Wskaźniki stanu: Aplikacja powinna wyświetlać wskaźnik ładowania podczas procesów wymagających czasu, takich jak generowanie quizu.

## 4. Granice produktu

Następujące funkcjonalności nie wchodzą w zakres wersji MVP (Minimum Viable Product) produktu:

- Przechowywanie historii wyników rozwiązanych quizów.
- Integracja z kontem Quizlet (np. w celu importu prywatnych zestawów).
- Import fiszek z innych źródeł niż publiczne linki Quizlet (np. pliki APKG, PDF, DOCX, TXT).
- Współdzielenie quizów między użytkownikami.
- Integracje z innymi platformami edukacyjnymi.
- Aplikacje mobilne (obecnie produkt będzie dostępny wyłącznie jako aplikacja internetowa).

## 5. Historyjki użytkowników

### Uwierzytelnianie i Zarządzanie Kontem

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji, podając swój login i hasło, abym mógł przechowywać i zarządzać swoimi quizami.
- Kryteria akceptacji:
  - Formularz rejestracji zawiera pola na login i hasło.
  - Po pomyślnej rejestracji, użytkownik jest automatycznie zalogowany i przekierowany do panelu głównego.
  - W przypadku, gdy użytkownik o podanym loginie już istnieje, wyświetlany jest odpowiedni komunikat błędu.

- ID: US-002
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto za pomocą loginu i hasła, aby uzyskać dostęp do moich quizów.
- Kryteria akceptacji:
  - Formularz logowania zawiera pola na login i hasło.
  - Po pomyślnym zalogowaniu, użytkownik jest przekierowany do panelu głównego (listy quizów).
  - W przypadku podania nieprawidłowych danych, wyświetlany jest odpowiedni komunikat błędu.

- ID: US-003
- Tytuł: Wylogowanie z aplikacji
- Opis: Jako zalogowany użytkownik, chcę móc wylogować się ze swojego konta, aby zabezpieczyć dostęp do moich danych.
- Kryteria akceptacji:
  - W interfejsie użytkownika znajduje się przycisk "Wyloguj".
  - Po kliknięciu przycisku, sesja użytkownika jest kończona i jest on przekierowywany na stronę logowania.

### Generowanie i Zarządzanie Quizami

- ID: US-004
- Tytuł: Generowanie quizu z publicznego linku Quizlet
- Opis: Jako zalogowany użytkownik, chcę móc wkleić link do publicznego zestawu fiszek na Quizlet, aby system wygenerował dla mnie quiz.
- Kryteria akceptacji:
  - W interfejsie znajduje się pole do wklejenia linku URL.
  - Po wklejeniu linku i zainicjowaniu generowania, aplikacja wyświetla animację ładowania.
  - System poprawnie importuje fiszki i generuje quiz z pytaniami, gdzie każde pytanie ma jedną poprawną i trzy nieprawidłowe odpowiedzi.
  - Domyślna liczba pytań w quizie jest równa liczbie fiszek w zestawie.
  - Nowo wygenerowany quiz ma status szkicu (draft).
  - Wygenerowany quiz zostaje wyświetlony w widoku edycji.

- ID: US-005
- Tytuł: Obsługa nieprawidłowego linku Quizlet
- Opis: Jako zalogowany użytkownik, próbując wygenerować quiz, chcę otrzymać jasny komunikat o błędzie, jeśli podany przeze mnie link jest nieprawidłowy, prywatny lub prowadzi do pustego zestawu.
- Kryteria akceptacji:
  - System weryfikuje, czy podany link prowadzi do publicznego i istniejącego zestawu fiszek na Quizlet.
  - W przypadku podania linku do prywatnego zestawu, wyświetlany jest komunikat: "Nie można zaimportować zestawu. Upewnij się, że zestaw jest publiczny."
  - W przypadku podania nieprawidłowego linku lub linku do pustego zestawu, wyświetlany jest odpowiedni komunikat błędu.

- ID: US-006
- Tytuł: Przeglądanie listy quizów
- Opis: Jako zalogowany użytkownik, chcę widzieć listę wszystkich moich wygenerowanych quizów, abym mógł łatwo nimi zarządzać.
- Kryteria akceptacji:
  - Na stronie głównej po zalogowaniu wyświetlana jest lista quizów.
  - Każdy element na liście pokazuje tytuł quizu oraz liczbę pytań.
  - Lista jest posortowana od najnowszego do najstarszego.

- ID: US-007
- Tytuł: Edycja tytułu quizu
- Opis: Jako zalogowany użytkownik, chcę mieć możliwość zmiany tytułu quizu, aby lepiej go identyfikować.
- Kryteria akceptacji:
  - Na liście quizów lub w widoku edycji quizu istnieje opcja zmiany tytułu.
  - Po zapisaniu, nowy tytuł jest widoczny na liście quizów i w widoku quizu.

- ID: US-008
- Tytuł: Usuwanie quizu
- Opis: Jako zalogowany użytkownik, chcę móc usunąć quiz, którego już nie potrzebuję.
- Kryteria akceptacji:
  - Na liście quizów przy każdym quizie znajduje się opcja usunięcia.
  - Przed ostatecznym usunięciem quizu, system wyświetla okno dialogowe z prośbą o potwierdzenie.
  - Po potwierdzeniu, quiz jest trwale usuwany z mojego konta i znika z listy.

### Edycja Pytań

- ID: US-009
- Tytuł: Przeglądanie i edycja pytań w quizie
- Opis: Jako zalogowany użytkownik, chcę móc przeglądać i edytować pytania oraz odpowiedzi w moim quizie, aby dostosować je do swoich potrzeb.
- Kryteria akceptacji:
  - Po wybraniu quizu, wyświetlana jest lista wszystkich pytań i odpowiedzi.
  - Każde pytanie i odpowiedź można edytować w trybie plain text.
  - W trybie edycji, pierwsza odpowiedź jest zawsze oznaczona jako poprawna.
  - Zmiany muszą zostać zapisane, aby zostały uwzględnione w quizie.
  - Jeśli quiz ma status szkicu ('draft') to w momencie zapisu quizu status zostaje zmieniony na opublikowany ('published').

- ID: US-010
- Tytuł: Ponowne generowanie odpowiedzi
- Opis: Jako zalogowany użytkownik, jeśli nie jestem zadowolony z wygenerowanych odpowiedzi, chcę mieć możliwość ponownego wygenerowania trzech fałszywych odpowiedzi dla konkretnego pytania.
- Kryteria akceptacji:
  - W widoku edycji pytania znajduje się przycisk "Generuj odpowiedzi ponownie".
  - Po kliknięciu, AI generuje nowy zestaw trzech fałszywych odpowiedzi, nie zmieniając pytania i poprawnej odpowiedzi.

- ID: US-011
- Tytuł: Usuwanie pytania z quizu
- Opis: Jako zalogowany użytkownik, chcę móc usunąć pojedyncze pytanie z quizu.
- Kryteria akceptacji:
  - W widoku edycji quizu przy każdym pytaniu znajduje się opcja jego usunięcia.
  - Przed usunięciem pytania, system wyświetla okno dialogowe z prośbą o potwierdzenie.
  - Po potwierdzeniu, pytanie jest trwale usuwane z quizu.

### Rozwiązywanie Quizu

- ID: US-012
- Tytuł: Rozpoczynanie i rozwiązywanie quizu
- Opis: Jako użytkownik, chcę móc rozpocząć rozwiązywanie wybranego quizu i odpowiadać na pytania.
- Kryteria akceptacji:
  - Na liście quizów znajduje się przycisk "Rozpocznij quiz".
  - Po rozpoczęciu, pytania wyświetlane są pojedynczo.
  - Kolejność pytań w quizie jest losowa.
  - Kolejność odpowiedzi dla każdego pytania jest losowa.
  - Użytkownik może wybrać tylko jedną odpowiedź na pytanie.
  - Po wybraniu odpowiedzi, użytkownik przechodzi do następnego pytania.
  - Informacja zwrotna o poprawności odpowiedzi nie jest wyświetlana w trakcie quizu.

- ID: US-013
- Tytuł: Zakończenie quizu i przeglądanie wyników
- Opis: Jako użytkownik, po odpowiedzeniu na wszystkie pytania, chcę zobaczyć ekran podsumowujący z moim wynikiem, abym mógł ocenić swoją wiedzę.
- Kryteria akceptacji:
  - Po ostatnim pytaniu, automatycznie wyświetlane jest podsumowanie.
  - Podsumowanie zawiera wynik procentowy poprawnych odpowiedzi.
  - Podsumowanie wyświetla listę wszystkich pytań.
  - Na liście pytań zaznaczona jest odpowiedź udzielona przez użytkownika oraz wskazana jest odpowiedź poprawna.
  - Na ekranie podsumowania znajduje się przycisk pozwalający wrócić do listy quizów.

## 6. Metryki sukcesu

Kluczowe metryki sukcesu dla wersji MVP skupiają się na jakości generowanych treści przez AI oraz ich akceptacji przez użytkowników.

- MS-01: Akceptacja pytań generowanych przez AI: Co najmniej 75% pytań wygenerowanych przez AI jest akceptowanych przez użytkownika.
  - Sposób pomiaru: Pytanie jest uznawane za zaakceptowane, jeśli użytkownik nie dokonał w nim żadnych modyfikacji (edycji treści, usunięcia pytania lub ponownego generowania odpowiedzi) przed pierwszym zaakceptowaniem quizu (tj. w momencie zmiany statusu quizu z draft na published).
- MS-02: Wykorzystanie AI w tworzeniu quizów: Co najmniej 75% wszystkich pytań w quizach tworzonych przez użytkowników pochodzi z generacji AI (a nie zostało dodanych ręcznie, co jest poza zakresem MVP, ale metryka jest zdefiniowana na przyszłość).
  - Sposób pomiaru: Stosunek liczby pytań wygenerowanych przez AI do całkowitej liczby pytań we wszystkich quizach.
