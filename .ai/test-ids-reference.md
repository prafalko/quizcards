# Referencja data-testid dla test�w E2E

## Scenariusz: Edycja tytu?u quizu

### Przegl?d

Ten dokument zawiera list? wszystkich atrybut�w `data-testid` dodanych do komponent�w zwi?zanych ze scenariuszem edycji tytu?u quizu i zapisywania zmian.

### Mapa krok�w scenariusza z data-testid

#### 1. Lista quiz�w (Dashboard)

| Element               | data-testid               | Lokalizacja    | Opis                                               |
| --------------------- | ------------------------- | -------------- | -------------------------------------------------- |
| Kontener listy quiz�w | `quiz-list`               | `QuizList.tsx` | G?�wny kontener zawieraj?cy wszystkie karty quiz�w |
| Karta quizu           | `quiz-card`               | `QuizCard.tsx` | Pojedyncza karta reprezentuj?ca quiz               |
| Tytu? quizu na karcie | `quiz-card-title`         | `QuizCard.tsx` | Tytu? quizu widoczny na li?cie                     |
| Przycisk "Rozwi??"    | `quiz-card-play-button`   | `QuizCard.tsx` | Przycisk do rozpocz?cia quizu                      |
| Przycisk "Edytuj"     | `quiz-card-edit-button`   | `QuizCard.tsx` | Przycisk prowadz?cy do widoku edycji               |
| Przycisk "Usu?"       | `quiz-card-delete-button` | `QuizCard.tsx` | Przycisk do usuni?cia quizu                        |

#### 2. Widok edycji quizu

| Element                             | data-testid                  | Lokalizacja         | Opis                                        |
| ----------------------------------- | ---------------------------- | ------------------- | ------------------------------------------- |
| Przycisk tytu?u (tryb tylko odczyt) | `editable-title-button`      | `EditableTitle.tsx` | Klikalne pole tytu?u aktywuj?ce tryb edycji |
| Pole input tytu?u (tryb edycji)     | `editable-title-input`       | `EditableTitle.tsx` | Pole tekstowe do edycji tytu?u              |
| Przycisk "Powr�? do listy quiz�w"   | `return-to-quiz-list-button` | `QuizEditView.tsx`  | Przycisk powrotu do dashboardu              |

#### 3. Pasek zapisywania zmian

| Element                            | data-testid               | Lokalizacja          | Opis                                     |
| ---------------------------------- | ------------------------- | -------------------- | ---------------------------------------- |
| Kontener paska                     | `save-changes-bar`        | `SaveChangesBar.tsx` | Ca?y pasek z niezapisanymi zmianami      |
| Komunikat o niezapisanych zmianach | `unsaved-changes-message` | `SaveChangesBar.tsx` | Tekst "Masz niezapisane zmiany w quizie" |
| Przycisk "Zapisz"                  | `save-changes-button`     | `SaveChangesBar.tsx` | Przycisk zapisuj?cy zmiany               |
| Przycisk "Odrzu? zmiany"           | `discard-changes-button`  | `SaveChangesBar.tsx` | Przycisk odrzucaj?cy niezapisane zmiany  |

### Scenariusz testowy krok po kroku

```typescript
// Przyk?adowy pseudo-kod testu E2E
test("Edycja tytu?u quizu", async () => {
  // 1. Przejd? do listy quiz�w
  await page.goto("/");

  // 2. Kliknij przycisk "Edytuj" na pierwszym quizie
  await page.getByTestId("quiz-card-edit-button").first().click();

  // 3. Kliknij w tytu? quizu (prze??cz w tryb edycji)
  await page.getByTestId("editable-title-button").click();

  // 4. Dopisz 'abc' na ko?cu tytu?u
  const titleInput = page.getByTestId("editable-title-input");
  await titleInput.fill((await titleInput.inputValue()) + "abc");
  await titleInput.blur(); // Wyj?cie z trybu edycji

  // 5. Sprawd?, czy pasek niezapisanych zmian jest widoczny
  await expect(page.getByTestId("save-changes-bar")).toBeVisible();
  await expect(page.getByTestId("unsaved-changes-message")).toHaveText("Masz niezapisane zmiany w quizie");

  // 6. Kliknij przycisk "Zapisz"
  await page.getByTestId("save-changes-button").click();

  // 7. Poczekaj a? zapisywanie si? zako?czy (pasek zniknie)
  await expect(page.getByTestId("save-changes-bar")).not.toBeVisible();

  // 8. Kliknij przycisk "Powr�? do listy quiz�w"
  await page.getByTestId("return-to-quiz-list-button").click();

  // 9. Sprawd?, czy tytu? na li?cie zosta? zaktualizowany
  await expect(page.getByTestId("quiz-card-title").first()).toContainText("abc");
});
```

### Najlepsze praktyki

1. **Umieszczanie atrybut�w**: Atrybuty `data-testid` s? umieszczane bezpo?rednio na rzeczywistych elementach DOM (button, input, div), a nie na komponentach React.

2. **Nazewnictwo**:
   - U?ywaj kebab-case
   - Nazwa powinna opisywa? funkcj? elementu lub akcj?
   - Dla przycisk�w: `{akcja}-button`
   - Dla kontener�w: `{nazwa}-bar`, `{nazwa}-list`
   - Dla p�l tekstowych: `{nazwa}-input`

3. **Kontekst**: W przypadku gdy ten sam typ elementu wyst?puje wielokrotnie (np. przyciski na karcie quizu), u?ywaj prefiksu kontekstowego (`quiz-card-edit-button` zamiast `edit-button`).

### Pliki zmodyfikowane

- `src/components/QuizCard.tsx`
- `src/components/QuizList.tsx`
- `src/components/EditableTitle.tsx`
- `src/components/ui/SaveChangesBar.tsx`
- `src/components/QuizEditView.tsx`
