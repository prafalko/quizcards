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
```

### Individual Test Files

#### 1. POST /api/quizzes/generate - Generate Quiz
```bash
npm run test:post:quizzes:generate
# or: npx tsx src/test/test-post-quizzes-generate.ts
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
# or: npx tsx src/test/test-get-quizzes.ts
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
# or: npx tsx src/test/test-get-quizzes-id.ts
```

**Tests:**
- ✅ Get quiz with valid ID
- ❌ Invalid UUID format (400)
- ❌ Non-existent quiz ID (404)
- ✅ Missing ID parameter (routes to list endpoint)

**Note:** This test automatically fetches a valid quiz ID from the list endpoint.

---

## Test Output

Each test script provides colored console output:
- 🧪 Test start
- ✅ Success
- ❌ Failure
- ⚠️  Warning
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
npx tsx src/test/test-generate-quiz.ts
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

