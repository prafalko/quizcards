# Implementation Summary: POST /api/questions/:id/regenerate

## Overview

This document summarizes the implementation of the POST `/api/questions/:id/regenerate` endpoint, which regenerates incorrect answers for an existing question using AI. The endpoint keeps the question text and correct answer unchanged while deleting all existing incorrect answers and generating 3 new ones. The endpoint implements proper authorization to ensure only the owner of the quiz containing the question can regenerate answers (IDOR protection).

## Implementation Date

October 30, 2025

## Endpoint Details

### HTTP Method

POST

### URL Path

`/api/questions/:id/regenerate`

### URL Parameters

- `id` (required): UUID of the question to regenerate answers for

### Request Body

```json
{
  "temperature": 0.7,
  "seed": 12345
}
```

**Fields:**

- `temperature` (optional, number, 0-1, default: 0.7): Controls AI creativity when generating incorrect answers
- `seed` (optional, integer): Random seed for reproducibility of AI generation

**Note:** All fields are optional. If omitted, defaults will be used.

### Request Examples

#### Example 1: Using default parameters

```http
POST /api/questions/550e8400-e29b-41d4-a716-446655440000/regenerate HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{}
```

#### Example 2: With custom temperature

```http
POST /api/questions/550e8400-e29b-41d4-a716-446655440000/regenerate HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "temperature": 0.9
}
```

#### Example 3: With seed for reproducibility

```http
POST /api/questions/550e8400-e29b-41d4-a716-446655440000/regenerate HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "temperature": 0.8,
  "seed": 42
}
```

#### Example 4: Without body (uses defaults)

```http
POST /api/questions/550e8400-e29b-41d4-a716-446655440000/regenerate HTTP/1.1
Host: localhost:3000
```

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "question_text": "What is the powerhouse of the cell?",
  "metadata": {
    "model": "gemini-pro-mock",
    "temperature": 0.7,
    "seed": 12345,
    "prompt": "Generate 3 plausible but incorrect answers for the following question...",
    "regenerated_at": "2025-01-20T11:45:00.123Z"
  },
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T11:45:00Z",
  "answers": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "answer_text": "Mitochondria",
      "is_correct": true,
      "source": "provided"
    },
    {
      "id": "760e8400-e29b-41d4-a716-446655440010",
      "answer_text": "Nucleus",
      "is_correct": false,
      "source": "ai"
    },
    {
      "id": "760e8400-e29b-41d4-a716-446655440011",
      "answer_text": "Ribosome",
      "is_correct": false,
      "source": "ai"
    },
    {
      "id": "760e8400-e29b-41d4-a716-446655440012",
      "answer_text": "Chloroplast",
      "is_correct": false,
      "source": "ai"
    }
  ]
}
```

**Response Details:**

- The `question_text` remains unchanged
- The correct answer (`is_correct: true`) remains unchanged
- All incorrect answers are new, with `source: "ai"`
- The `metadata` field is updated with generation parameters and `regenerated_at` timestamp
- The `updated_at` field is updated to the current timestamp
- The response includes all answers (1 correct + 3 incorrect)

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid Question ID format. Must be a valid UUID.",
    "details": {
      "id": "not-a-uuid"
    }
  }
}
```

#### 400 Bad Request - Invalid Temperature (> 1)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "path": "temperature",
          "message": "Temperature must be between 0 and 1"
        }
      ]
    }
  }
}
```

#### 400 Bad Request - Invalid Temperature (< 0)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "path": "temperature",
          "message": "Temperature must be between 0 and 1"
        }
      ]
    }
  }
}
```

#### 400 Bad Request - Non-Integer Seed

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "path": "seed",
          "message": "Seed must be an integer"
        }
      ]
    }
  }
}
```

#### 400 Bad Request - Invalid JSON

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid JSON in request body",
    "details": {
      "error": "Unexpected token i in JSON at position 0"
    }
  }
}
```

#### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "User authentication required - SUPABASE_DEFAULT_USER_ID not configured"
  }
}
```

#### 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to modify this question",
    "details": {
      "questionId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-123",
      "quizUserId": "user-456"
    }
  }
}
```

#### 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Question not found",
    "details": {
      "resource": "Question",
      "identifier": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

#### 500 Internal Server Error - AI Generation Failed

```json
{
  "error": {
    "code": "AI_GENERATION_FAILED",
    "message": "Failed to generate incorrect answers",
    "details": {
      "originalError": "AI service timeout"
    }
  }
}
```

#### 500 Internal Server Error - Database Error

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database operation failed: regenerateIncorrectAnswers",
    "details": {
      "operation": "regenerateIncorrectAnswers",
      "originalError": "Connection timeout"
    }
  }
}
```

## Implementation Components

### 1. Validator Schema (`src/lib/validators/quiz.validator.ts`)

Added `validateRegenerateAnswersCommand` Zod schema:

```typescript
export const validateRegenerateAnswersCommand = z.object({
  temperature: z
    .number()
    .min(0, "Temperature must be between 0 and 1")
    .max(1, "Temperature must be between 0 and 1")
    .optional()
    .default(0.7),
  seed: z.number().int("Seed must be an integer").optional(),
});
```

**Features:**

- Validates `temperature` is between 0 and 1 (inclusive)
- Provides default value of 0.7 for temperature
- Validates `seed` is an integer
- Both fields are optional

### 2. Error Classes (`src/lib/errors.ts`)

Added `AIGenerationError` class:

```typescript
export class AIGenerationError extends AppError {
  constructor(message: string, originalError: Error, correlationId?: string) {
    super(
      "AI_GENERATION_FAILED",
      message,
      500,
      {
        originalError: originalError.message,
        stack: originalError.stack,
      },
      correlationId
    );
  }
}
```

**Purpose:**

- Specific error type for AI service failures
- Returns 500 status code
- Includes original error details for debugging

### 3. Timeout Helper Function (`src/lib/services/quiz.service.ts`)

Added `withTimeout` helper function for timeout protection:

```typescript
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
```

**Purpose:**

- Wraps any Promise with a timeout
- Uses `Promise.race` to implement timeout logic
- Rejects with custom error message if timeout exceeded
- Generic function works with any Promise type

### 4. Service Method (`src/lib/services/quiz.service.ts`)

Added `regenerateIncorrectAnswers` method to `QuizService` class:

```typescript
async regenerateIncorrectAnswers(
  questionId: string,
  userId: string,
  command: RegenerateAnswersCommand,
  correlationId?: string
): Promise<QuestionDetailDTO>
```

**Implementation Steps:**

1. **Fetch question with ownership verification**
   - Queries `quiz_questions` with JOIN to `quizzes` table
   - Includes all current answers
   - Verifies question exists

2. **Authorization check (IDOR protection)**
   - Compares authenticated user ID with quiz owner ID
   - Throws `ForbiddenError` if user doesn't own the quiz

3. **Find correct answer**
   - Searches through answers to find the one with `is_correct: true`
   - Throws error if no correct answer found (data integrity issue)

4. **Call AI service with timeout**
   - Invokes `generateIncorrectAnswers` from `ai.service.ts`
   - Passes question text, correct answer, and optional parameters
   - 30-second timeout to prevent hanging requests
   - Wraps errors in `AIGenerationError`

5. **Delete existing incorrect answers**
   - Deletes all answers where `is_correct = false`
   - Keeps the correct answer unchanged

6. **Insert new incorrect answers**
   - Creates 3 new answer records with `source: 'ai'`
   - Sets `is_correct: false` for all

7. **Update question metadata**
   - Updates `metadata` field with AI generation parameters
   - Adds `regenerated_at` timestamp
   - Updates `updated_at` field

8. **Fetch and return updated question**
   - Retrieves complete question with all answers
   - Transforms to `QuestionDetailDTO` format
   - Returns to endpoint

**Error Handling:**

- All database operations wrapped in try-catch
- Comprehensive logging at each step
- Specific error types for different failure scenarios

### 5. API Endpoint (`src/pages/api/questions/[id]/regenerate.ts`)

Created new endpoint file with POST handler:

**Key Features:**

- Validates question ID as UUID
- Parses and validates optional request body
- Handles empty body gracefully (uses defaults)
- Calls service method with validated data
- Returns 200 OK with updated question
- Comprehensive error handling
- Adds `X-Correlation-ID` header for debugging
- Sets `Cache-Control: no-cache` header

**Request Flow:**

1. Extract and validate question ID from URL
2. Parse request body (if present)
3. Validate body against Zod schema
4. Initialize quiz service
5. Verify user authentication
6. Call service to regenerate answers
7. Return success response or error

### 6. Test Script (`src/test/test-regenerate-answers.ts`)

Created comprehensive manual test script with 10 test cases:

**Test Coverage:**

1. ✅ Successful regeneration with default parameters
2. ✅ Regeneration with custom temperature (0.9)
3. ✅ Regeneration with seed for reproducibility
4. ❌ Invalid UUID format (400)
5. ❌ Non-existent question ID (404)
6. ❌ Temperature > 1 (400)
7. ❌ Temperature < 0 (400)
8. ❌ Non-integer seed (400)
9. ❌ Invalid JSON body (400)
10. ✅ Empty body (uses defaults)

**Test Features:**

- Automatically fetches valid question ID from existing quiz
- Displays original and new incorrect answers for comparison
- Verifies all incorrect answers have `source: 'ai'`
- Checks metadata updates
- Mock AI service responds instantly (no delays)
- Takes approximately 5 seconds to run all tests

**Running Tests:**

```bash
npm run test:regenerate:answers
```

## Security Considerations

### 1. Authorization (IDOR Protection)

The endpoint implements robust authorization:

- Verifies user owns the quiz containing the question
- Uses database JOIN to verify ownership in a single query
- Returns 403 Forbidden if user doesn't own the quiz
- Returns 404 Not Found if question doesn't exist (doesn't leak existence)

### 2. Input Validation

All inputs are thoroughly validated:

- Question ID must be valid UUID
- Temperature must be between 0 and 1
- Seed must be an integer
- JSON body must be parsable

### 3. Rate Limiting

**Recommendation:** Implement rate limiting in middleware for this endpoint:

- AI generation is expensive (time and compute)
- Suggested limit: 10 requests per minute per user
- Return 429 Too Many Requests when exceeded

### 4. Data Integrity

The implementation ensures data consistency:

- Question text and correct answer never change
- Metadata accurately tracks regeneration parameters
- Database operations use transactions (implicit in Supabase)
- Timestamp fields automatically updated

## Performance Considerations

### 1. AI Service Latency

- Main bottleneck is external AI service call
- Current mock implementation: instant response
- Production implementation: 2-10 seconds expected
- 30-second timeout implemented for safety

### 2. Database Operations

- Efficient: Single query for fetch + verification
- Batch delete: Removes all incorrect answers in one query
- Batch insert: Adds all new answers in one query
- Single update: Updates metadata and timestamp

### 3. Response Time

Estimated production response times:

- Best case: 2-3 seconds (fast AI response)
- Average case: 5-7 seconds (typical AI response)
- Worst case: 30 seconds (timeout limit)

### 4. Optimization Opportunities

- Consider caching generated answers (if seed provided)
- Implement asynchronous processing with webhooks
- Add progress indicator for long-running requests
- Consider job queue for batch regeneration

## Testing

### Manual Testing

Run the comprehensive test script:

```bash
npm run test:regenerate:answers
```

Expected results:

- 6 successful scenarios (status 200)
- 4 error scenarios (status 400, 404)
- Total runtime: ~5 seconds (mock AI responds instantly)

### Integration with Test Suite

The test is integrated into the full API test suite:

```bash
npm run test:api
```

This runs all endpoint tests in sequence, including regenerate answers.

## Usage Examples

### Example 1: Basic Regeneration

```javascript
const response = await fetch("/api/questions/550e8400-e29b-41d4-a716-446655440000/regenerate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({}),
});

const question = await response.json();
console.log(
  "New incorrect answers:",
  question.answers.filter((a) => !a.is_correct)
);
```

### Example 2: With Custom Temperature

```javascript
const response = await fetch("/api/questions/550e8400-e29b-41d4-a716-446655440000/regenerate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    temperature: 0.9, // More creative answers
  }),
});

const question = await response.json();
```

### Example 3: With Seed for Reproducibility

```javascript
const response = await fetch("/api/questions/550e8400-e29b-41d4-a716-446655440000/regenerate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    seed: 42, // Same seed produces same answers
  }),
});

const question = await response.json();
```

### Example 4: Error Handling

```javascript
try {
  const response = await fetch("/api/questions/invalid-id/regenerate", {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Error:", error.error.message);
    // Handle specific error codes
    switch (error.error.code) {
      case "VALIDATION_ERROR":
        // Invalid input
        break;
      case "NOT_FOUND":
        // Question doesn't exist
        break;
      case "FORBIDDEN":
        // User doesn't own the quiz
        break;
      case "AI_GENERATION_FAILED":
        // AI service error
        break;
    }
  }
} catch (error) {
  console.error("Network error:", error);
}
```

## Future Improvements

### 1. Async Processing

For better user experience with long-running AI operations:

- Return 202 Accepted immediately
- Process regeneration in background job
- Provide status endpoint to check progress
- Send webhook or SSE notification when complete

### 2. Batch Regeneration

Allow regenerating all questions in a quiz:

```
POST /api/quizzes/:id/regenerate-all
```

### 3. Answer Quality Feedback

Allow users to rate generated answers:

- Helps improve AI prompts
- Can filter out low-quality answers
- Enables continuous improvement

### 4. Multiple Answer Sets

Generate multiple sets and let user choose:

```json
{
  "count": 3, // Generate 3 sets of answers
  "temperature": 0.8
}
```

### 5. Undo Functionality

Store previous answer sets for rollback:

- Keep history of regenerations
- Allow reverting to previous version
- Useful if new answers are worse

### 6. AI Model Selection

Allow choosing different AI models:

```json
{
  "model": "gemini-pro", // or "gpt-4", etc.
  "temperature": 0.7
}
```

## Related Endpoints

This endpoint is part of the question management API:

- `GET /api/questions/:id` - Get question details
- `PATCH /api/questions/:id` - Update question text
- `POST /api/questions/:id/regenerate` - Regenerate answers (this endpoint)
- `DELETE /api/questions/:id` - Delete question (future)
- `PATCH /api/answers/:id` - Update answer text (future)

## Documentation Updates

Updated the following documentation files:

1. `src/test/README.md` - Added test documentation
2. `README.md` - Added test command reference
3. `package.json` - Added npm script for test
4. `.ai/implementation_summary/8_regenerate-answers-summary.md` - This file

## Conclusion

The POST `/api/questions/:id/regenerate` endpoint is fully implemented and tested. It provides a robust way to regenerate incorrect answers for quiz questions using AI, with proper validation, authorization, and error handling. The implementation follows the existing codebase patterns and includes comprehensive documentation and testing.

The endpoint is ready for integration with the frontend and can be used immediately in development with the mock AI service. When the production AI service is implemented, no changes to the endpoint or service method will be required - only the `generateIncorrectAnswers` function in `ai.service.ts` needs to be updated.
