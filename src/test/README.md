# Manual API Tests

This directory contains manual test scripts for QuizCards API endpoints. These tests are designed to be run during development to verify endpoint functionality.

## Prerequisites

1. Start the development server:

```bash
npm run dev
```

2. Ensure you have a Supabase instance running with the correct schema
3. Make sure `SUPABASE_DEFAULT_USER_ID` is set in your `.env` file

## Running Tests

### Test All Endpoints

Run all tests in sequence:

```bash
npm run test:api
```

Or run individual tests:

```bash
npm run test:post:quizzes:generate  # POST /api/quizzes/generate
npm run test:get:quizzes            # GET /api/quizzes
npm run test:get:quizzes:id         # GET /api/quizzes/:id
npm run test:patch:quizzes:id       # PATCH /api/quizzes/:id
npm run test:delete:quiz            # DELETE /api/quizzes/:id
npm run test:get:question           # GET /api/questions/:id
npm run test:patch:question         # PATCH /api/questions/:id
npm run test:delete:question        # DELETE /api/questions/:id
npm run test:regenerate:answers     # POST /api/questions/:id/regenerate
npm run test:patch:answers:id       # PATCH /api/answers/:id
```

### Individual Test Files

#### 1. POST /api/quizzes/generate - Generate Quiz

```bash
npm run test:post:quizzes:generate
```

**Tests:**

- ✅ Generate quiz with valid Quizlet URL
- ✅ Generate quiz with custom title
- ❌ Invalid URL format (400)
- ❌ Non-Quizlet URL (400)
- ❌ Missing source_url (400)
- ❌ Empty title (400)
- ❌ Title too long (400)
- ❌ Invalid JSON body (400)
- ❌ Invalid Quizlet URL pattern (400)

**Note:** This endpoint uses MOCK services for Quizlet and AI in development.

---

#### 2. GET /api/quizzes - List Quizzes

```bash
npm run test:get:quizzes
```

**Tests:**

- ✅ Get all quizzes (no filter)
- ✅ Filter by status=draft
- ✅ Filter by status=published
- ❌ Invalid status parameter (400)

---

#### 3. GET /api/quizzes/:id - Get Quiz by ID

```bash
npm run test:get:quizzes:id
```

**Tests:**

- ✅ Get quiz with valid ID
- ❌ Invalid UUID format (400)
- ❌ Non-existent quiz ID (404)
- ✅ Missing ID parameter (routes to list endpoint)

**Note:** This test automatically fetches a valid quiz ID from the list endpoint.

---

#### 4. PATCH /api/quizzes/:id - Update Quiz

```bash
npm run test:patch:quizzes:id
```

**Tests:**

- ✅ Successful quiz update (200)
- ❌ Invalid UUID format (400)
- ❌ Non-existent quiz ID (404)
- ❌ Empty title (400)
- ❌ Title too long (>255 chars) (400)
- ❌ Missing title field (400)
- ❌ Invalid JSON body (400)
- ✅ Title with whitespace (trimmed automatically)

**Note:** This test automatically fetches a valid quiz ID and restores the original title after testing.

---

#### 5. DELETE /api/quizzes/:id - Delete Quiz

```bash
npm run test:delete:quiz
```

**Tests:**

- ✅ Successful quiz deletion (204)
- ❌ Invalid UUID format (400)
- ❌ Non-existent quiz ID (404)
- ✅ Verify cascade deletion (questions and answers deleted)

**Note:** This test creates a temporary quiz for deletion testing.

---

#### 6. GET /api/questions/:id - Get Question by ID

```bash
npm run test:get:question
```

**Tests:**

- ✅ Get question with valid ID
- ❌ Invalid UUID format (400)
- ❌ Non-existent question ID (404)
- ✅ Verify answers are included
- ✅ Verify ownership protection (IDOR)

**Note:** This test automatically fetches a valid question ID from an existing quiz.

---

#### 7. PATCH /api/questions/:id - Update Question Text

```bash
npm run test:patch:question
```

**Tests:**

- ✅ Successful question update (200)
- ❌ Invalid UUID format (400)
- ❌ Non-existent question ID (404)
- ❌ Empty question text (400)
- ❌ Question text too long (>2048 chars) (400)
- ❌ Missing question_text field (400)
- ❌ Invalid JSON body (400)
- ✅ Question text with whitespace (trimmed automatically)

**Note:** This test automatically fetches a valid question ID and restores the original text after testing.

---

#### 8. DELETE /api/questions/:id - Delete Question
```bash
npm run test:delete:question
```

**Tests:**
- ✅ Successful question deletion (204)
- ❌ Invalid UUID format (400)
- ❌ Non-existent question ID (404)
- ✅ Verify response body is empty (204)
- ✅ Verify question no longer exists
- ✅ Verify quiz question count decreased
- ✅ Attempt to delete same question again (404)
- ✅ Verify CASCADE deletion of answers

**Note:** This test creates a temporary quiz with questions, deletes one question, and verifies cascade deletion of answers. No existing data is harmed.

---

#### 9. POST /api/questions/:id/regenerate - Regenerate Question Answers

```bash
npm run test:regenerate:answers
```

**Tests:**

- ✅ Successful answer regeneration with default parameters (200)
- ✅ Regeneration with custom temperature parameter
- ✅ Regeneration with seed for reproducibility
- ❌ Invalid UUID format (400)
- ❌ Non-existent question ID (404)
- ❌ Invalid temperature > 1 (400)
- ❌ Invalid temperature < 0 (400)
- ❌ Non-integer seed (400)
- ❌ Invalid JSON body (400)
- ✅ Empty request body (uses defaults)

**Note:** The test verifies that incorrect answers are regenerated while keeping the question text and correct answer unchanged. The AI service has a 30-second timeout for safety.

---

#### 10. PATCH /api/answers/:id - Update Answer Text

```bash
npm run test:patch:answers:id
```

**Tests:**

- ✅ Successful answer update (200)
- ✅ Source change from 'ai' to 'ai-edited' when applicable
- ❌ Invalid UUID format (400)
- ❌ Non-existent answer ID (404)
- ❌ Empty answer text (400)
- ❌ Answer text too long (>512 chars) (400)
- ❌ Missing answer_text field (400)
- ❌ Invalid JSON body (400)
- ✅ Answer text with whitespace (trimmed automatically)

**Note:** The test automatically finds an existing incorrect answer from a quiz, updates it, and then restores the original text. It specifically tests the behavior where AI-generated answers (source: 'ai') are marked as edited (source: 'ai-edited') when manually modified.

---

## Test Output

Each test script provides colored console output:

- 🧪 Test start
- ✅ Success
- ❌ Failure
- ⚠️ Warning
- 🏁 Test completion

Example output:

```
🧪 Testing GET /api/quizzes endpoint

Test 1: GET /api/quizzes (no filter)
Status: 200
✅ SUCCESS: Got 5 quizzes
   First quiz: "Biology Flashcards" (25 questions)

🏁 Tests completed!
```

### Test Summary

When running `npm run test:api`, you'll get a comprehensive summary at the end:

```
================================================================================
📊 TEST SUMMARY
================================================================================

Total Tests: 42
✅ Passed: 40
❌ Failed: 2
⏱️  Duration: 15.42s

Results by endpoint:
--------------------------------------------------------------------------------
✅ POST /api/quizzes/generate              8/8 passed (3.21s)
✅ GET /api/quizzes                        4/4 passed (0.52s)
❌ GET /api/quizzes/:id                    2/4 passed (0.78s)
...

❌ FAILED TESTS:
--------------------------------------------------------------------------------

GET /api/quizzes/:id:
  • Test 3: GET /api/quizzes/:id with invalid UUID (should fail)
    ❌ FAILED: Expected 400 status

PATCH /api/answers/:id:
  • Test 2: PATCH with empty answer_text (should fail)
    ❌ FAILED: Expected 400 status
```

This summary makes it easy to:
- See overall test health at a glance
- Identify which endpoints have issues
- Quickly locate failed tests without scrolling through logs

## Server Configuration

By default, tests connect to `http://localhost:3000`. If your dev server runs on a different port, update the `BASE_URL` constant in each test file.

```typescript
const BASE_URL = "http://localhost:3000"; // Change this if needed
```

## Database Setup

To test effectively, you should have:

1. At least one quiz in the database (for GET /api/quizzes/:id tests)
2. Mix of draft and published quizzes (for status filtering tests)

You can generate test data by running:

```bash
npx tsx src/test/test-post-quizzes-generate.ts
```

## Troubleshooting

### "No quizzes found in database"

Run the generate-quiz test first to create some test data.

### "Connection refused" or "fetch failed"

Make sure the dev server is running:

```bash
npm run dev
```

### "SUPABASE_DEFAULT_USER_ID not configured"

Add the following to your `.env` file:

```env
SUPABASE_DEFAULT_USER_ID=your-user-id-here
```

## Future Improvements

These manual tests will be replaced with automated integration tests using:

- Vitest for test runner
- Supertest or native fetch for API testing
- Test database for isolated testing
- CI/CD integration

For now, these manual scripts provide quick verification during development.
