# Implementation Summary: PATCH /api/questions/:id

## Overview

This document summarizes the implementation of the PATCH `/api/questions/:id` endpoint, which updates the text of an existing question. The endpoint implements proper authorization to ensure only the owner of the quiz containing the question can update it (IDOR protection). The `updated_at` field is automatically updated in the database.

## Implementation Date

October 30, 2025

## Endpoint Details

### HTTP Method

PATCH

### URL Path

`/api/questions/:id`

### URL Parameters

- `id` (required): UUID of the question to update

### Request Body

```json
{
  "question_text": "Updated question text?"
}
```

### Request Example

```http
PATCH /api/questions/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "question_text": "What is the primary function of photosynthesis?"
}
```

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "question_text": "What is the primary function of photosynthesis?",
  "metadata": {
    "model": "gemini-pro",
    "temperature": 0.7,
    "seed": 12345,
    "prompt": "Generate 3 incorrect answers..."
  },
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T11:30:00Z",
  "answers": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "answer_text": "The process by which plants convert light energy into chemical energy",
      "is_correct": true,
      "source": "provided"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "answer_text": "The process of cellular respiration",
      "is_correct": false,
      "source": "ai"
    }
  ]
}
```

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid Question ID format. Must be a valid UUID.",
    "details": {
      "id": "not-a-uuid",
      "correlationId": "req_abc123"
    }
  }
}
```

#### 400 Bad Request - Empty Question Text

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "path": "question_text",
          "message": "Question text cannot be empty"
        }
      ],
      "correlationId": "req_abc124"
    }
  }
}
```

#### 400 Bad Request - Question Text Too Long

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "path": "question_text",
          "message": "Question text must not exceed 2048 characters"
        }
      ],
      "correlationId": "req_abc125"
    }
  }
}
```

#### 400 Bad Request - Missing Question Text Field

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "path": "question_text",
          "message": "Required"
        }
      ],
      "correlationId": "req_abc126"
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
      "error": "Unexpected token 'i', \"invalid-json\" is not valid JSON",
      "correlationId": "req_abc127"
    }
  }
}
```

#### 404 Not Found - Question Not Found or Access Denied

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Question with ID '00000000-0000-0000-0000-000000000000' not found",
    "details": {
      "resourceType": "Question",
      "resourceId": "00000000-0000-0000-0000-000000000000",
      "correlationId": "req_abc128"
    }
  }
}
```

#### 500 Internal Server Error - Server or Database Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred while updating the question",
    "details": {
      "correlationId": "req_abc129"
    }
  }
}
```

## Implementation Components

### 1. Validator Schema (`src/lib/validators/quiz.validator.ts`)

#### New Schema: `validateUpdateQuestionCommand`

```typescript
export const validateUpdateQuestionCommand = z.object({
  question_text: z
    .string()
    .min(1, "Question text cannot be empty")
    .max(2048, "Question text must not exceed 2048 characters")
    .trim(),
});
```

**Validation Rules:**

- `question_text` is required
- Must be a string
- Minimum length: 1 character (after trimming)
- Maximum length: 2048 characters
- Automatically trims leading and trailing whitespace

**Error Messages:**

- Empty string: "Question text cannot be empty"
- Too long: "Question text must not exceed 2048 characters"

### 2. Service Method (`src/lib/services/quiz.service.ts`)

#### New Method: `updateQuestionText`

```typescript
async updateQuestionText(
  questionId: string,
  userId: string,
  data: UpdateQuestionCommand,
  correlationId?: string
): Promise<QuestionDetailDTO>
```

**Parameters:**

- `questionId`: UUID of the question to update
- `userId`: User ID for authorization (IDOR protection)
- `data`: Validated update command containing new question text
- `correlationId`: Optional request correlation ID for tracking

**Returns:**

- `Promise<QuestionDetailDTO>`: Updated question with all answers

**Throws:**

- `NotFoundError`: If question doesn't exist or user doesn't have access
- `DatabaseError`: For database operation errors

**Implementation Steps:**

1. **Verification Query** (IDOR Protection)

   ```sql
   SELECT
     quiz_questions.id,
     quizzes.user_id
   FROM quiz_questions
   INNER JOIN quizzes ON quiz_questions.quiz_id = quizzes.id
   WHERE quiz_questions.id = $questionId
     AND quizzes.user_id = $userId
   ```

   - Joins with `quizzes` table to verify ownership
   - Uses `INNER JOIN` to ensure question belongs to user's quiz
   - Returns 404 if no match found

2. **Update Operation**

   ```sql
   UPDATE quiz_questions
   SET
     question_text = $newText,
     updated_at = NOW()
   WHERE id = $questionId
   ```

   - Updates question text
   - Automatically updates `updated_at` timestamp
   - No additional user_id check needed (already verified)

3. **Fetch Updated Data**

   ```sql
   SELECT
     quiz_questions.*,
     answers.*
   FROM quiz_questions
   LEFT JOIN answers ON answers.question_id = quiz_questions.id
   WHERE quiz_questions.id = $questionId
   ```

   - Retrieves updated question with all answers
   - Orders answers by creation date

4. **Transform to DTO**
   - Parses metadata JSON
   - Sorts answers by creation date
   - Maps to `QuestionDetailDTO` format
   - Omits `quiz_id` field

**Logging:**

- Request start with parameters
- Database operation results (success/failure)
- Request completion with duration and metadata
- Errors with full context

### 3. API Endpoint (`src/pages/api/questions/[id].ts`)

#### New Handler: `PATCH`

```typescript
export const PATCH: APIRoute = async ({ params, request }) => {
  // Implementation
};
```

**Request Flow:**

1. **ID Validation**
   - Extract `id` from URL parameters
   - Validate it's a non-empty string
   - Validate UUID format using `validateId()`
   - Throw `ValidationError` if invalid

2. **Request Body Parsing**
   - Parse JSON body
   - Catch and handle JSON parsing errors
   - Return 400 with clear error message if invalid

3. **Request Body Validation**
   - Use `validateUpdateQuestionCommand.safeParse()`
   - Collect all validation errors
   - Return 400 with detailed error information
   - Extract validated data as `UpdateQuestionCommand`

4. **User Context**
   - Get user ID from `supabaseDefaultUserId` (MVP)
   - Future: Get from `Astro.locals.user`
   - Throw `UnauthorizedError` if missing

5. **Service Call**
   - Call `quizService.updateQuestionText()`
   - Pass validated data and user context
   - Handle service errors appropriately

6. **Success Response**
   - Return updated question as JSON
   - Status code: 200 OK
   - Include `X-Correlation-ID` header
   - Set `Cache-Control: no-cache` (updated data)

7. **Error Handling**
   - Map `AppError` instances to appropriate responses
   - Handle unexpected errors with 500 response
   - Log all errors with full context
   - Include correlation ID in all error responses

**Response Headers:**

```
Content-Type: application/json
Cache-Control: no-cache, no-store, must-revalidate
X-Correlation-ID: req_abc123
```

## Security Considerations

### IDOR Protection

The endpoint implements robust protection against Insecure Direct Object Reference (IDOR) vulnerabilities:

1. **Authorization Check**: Before updating, the service verifies that the question belongs to a quiz owned by the authenticated user through a JOIN query
2. **Two-Step Verification**: First verify ownership, then perform update
3. **No Information Leakage**: Returns 404 for both non-existent questions and questions belonging to other users
4. **Consistent Error Messages**: Same error response regardless of whether question doesn't exist or user lacks access

### Input Validation

- **UUID Format**: Strict validation to prevent injection attacks
- **Text Length**: Enforced maximum of 2048 characters to prevent abuse
- **Whitespace Handling**: Automatic trimming prevents empty content
- **JSON Parsing**: Safe parsing with error handling

### Database Security

- **Prepared Statements**: Supabase client uses parameterized queries
- **Minimal Privileges**: Service only performs necessary operations
- **Audit Trail**: All updates logged with timestamps and user context

## Data Flow

```
Client Request (PATCH /api/questions/:id)
    ↓
[1] Extract and validate question ID from URL
    ↓
[2] Parse and validate request body JSON
    ↓
[3] Validate request body against Zod schema
    ↓
[4] Get user context (user_id)
    ↓
[5] QuizService.updateQuestionText()
    ↓
    [5a] Verify question ownership (INNER JOIN with quizzes)
         → If not found or wrong user: throw NotFoundError
    ↓
    [5b] Update question text and updated_at
         → If error: throw DatabaseError
    ↓
    [5c] Fetch updated question with answers
         → If error: throw DatabaseError
    ↓
    [5d] Transform to QuestionDetailDTO
    ↓
[6] Return 200 OK with updated question data
```

## Database Schema Impact

### Tables Involved

1. **quiz_questions** (Updated)
   - `id`: Primary key (UUID)
   - `quiz_id`: Foreign key to quizzes
   - `question_text`: Text to be updated
   - `metadata`: Preserved (not updated)
   - `created_at`: Preserved (not updated)
   - `updated_at`: **Automatically updated to current timestamp**

2. **quizzes** (Read-only for verification)
   - `id`: Primary key (UUID)
   - `user_id`: Used for authorization check

3. **answers** (Read-only)
   - `question_id`: Foreign key to quiz_questions
   - All fields returned in response

### Indexes Used

- Primary key on `quiz_questions.id` (for UPDATE)
- Foreign key index on `quiz_questions.quiz_id` (for JOIN verification)
- Foreign key index on `answers.question_id` (for fetching answers)

## Performance Considerations

### Query Optimization

1. **Single Ownership Check**: Uses efficient INNER JOIN to verify ownership in one query
2. **Indexed Lookups**: All queries use primary keys or foreign keys with indexes
3. **Minimal Data Transfer**: Only fetches necessary fields

### Response Time Targets

- Average: < 100ms
- 95th percentile: < 200ms
- 99th percentile: < 500ms

### Scalability

- No N+1 queries: Single query for verification, single query for update, single query for retrieval
- Efficient indexing on UUID primary keys
- Minimal data returned (only one question + answers)

## Testing

### Manual Test Script

Location: `src/test/test-patch-question.ts`

Run with:

```bash
npm run test:patch:question
```

### Test Coverage

#### Success Scenarios

1. ✅ **Successful Update**: Update question text with valid data
   - Verifies question text is updated
   - Verifies `updated_at` is changed
   - Verifies answers are preserved
   - Checks correlation ID header

2. ✅ **Whitespace Trimming**: Text with leading/trailing spaces is trimmed
   - Verifies automatic trimming
   - Ensures no empty content after trim

#### Error Scenarios

1. ❌ **Invalid UUID Format** (400)
   - Tests with non-UUID string
   - Verifies proper error message

2. ❌ **Non-existent Question** (404)
   - Tests with valid UUID that doesn't exist
   - Verifies 404 response

3. ❌ **Empty Question Text** (400)
   - Tests with empty string
   - Verifies validation error

4. ❌ **Question Text Too Long** (400)
   - Tests with 2049+ character string
   - Verifies length validation

5. ❌ **Missing question_text Field** (400)
   - Tests with empty request body
   - Verifies required field validation

6. ❌ **Invalid JSON** (400)
   - Tests with malformed JSON
   - Verifies JSON parsing error handling

### Test Data Requirements

- At least one quiz with questions in the database
- Test uses first available question
- Restores original question text after testing

### Running Tests

```bash
# Run only this endpoint's tests
npm run test:patch:question

# Run all API tests (includes this endpoint)
npm run test:api
```

## Error Handling

### Error Types and Status Codes

| Error Type          | Status Code | Description                                          |
| ------------------- | ----------- | ---------------------------------------------------- |
| `ValidationError`   | 400         | Invalid UUID, validation failure, JSON parsing error |
| `NotFoundError`     | 404         | Question doesn't exist or user doesn't have access   |
| `DatabaseError`     | 500         | Database operation failure                           |
| `UnauthorizedError` | 401         | User not authenticated (future)                      |
| Generic Error       | 500         | Unexpected server error                              |

### Error Response Format

All errors follow the standard `ErrorResponse` format:

```typescript
{
  error: {
    code: string;        // Error code (e.g., "VALIDATION_ERROR")
    message: string;     // Human-readable error message
    details?: {          // Optional additional details
      [key: string]: unknown;
    };
  }
}
```

### Correlation IDs

- Every request generates a unique correlation ID
- Included in all log messages
- Returned in `X-Correlation-ID` response header
- Helps trace requests across logs and services

## Logging

### Log Events

1. **Request Start**

   ```
   INFO: Request started
   - Endpoint: PATCH /api/questions/:id
   - Correlation ID: req_abc123
   - Parameters: { questionId: "..." }
   ```

2. **Validation Errors**

   ```
   WARN: Validation error
   - Correlation ID: req_abc123
   - Error: Invalid UUID format
   - Details: { id: "not-a-uuid" }
   ```

3. **Database Operations**

   ```
   INFO: Database operation
   - Operation: select
   - Table: quiz_questions
   - Status: success
   ```

4. **Request Complete**

   ```
   INFO: Request completed
   - Duration: 87ms
   - Status: 200
   - Question ID: 550e8400-e29b-41d4-a716-446655440000
   ```

5. **Errors**
   ```
   ERROR: Request failed
   - Correlation ID: req_abc123
   - Error type: NotFoundError
   - Message: Question not found
   ```

## Future Enhancements

### Authentication Integration

When Supabase Auth is implemented:

1. Replace `supabaseDefaultUserId` with `Astro.locals.user.id`
2. Add JWT token validation
3. Implement proper 401 responses
4. Add rate limiting per user

### Additional Features

1. **Audit Log**: Track all question updates with user and timestamp
2. **Version History**: Keep track of previous question texts
3. **Bulk Updates**: Allow updating multiple questions at once
4. **Rich Text Support**: Support for formatted text, images, etc.
5. **Question Difficulty**: Add difficulty rating field
6. **Tags**: Add tags or categories to questions

### Performance Optimizations

1. **Caching**: Cache frequently accessed questions
2. **Database Connection Pooling**: Optimize connection usage
3. **Response Compression**: Compress large responses
4. **CDN Integration**: Serve static content from CDN

## Related Endpoints

### Questions

- `GET /api/questions/:id` - Retrieve a question ([Implementation Summary](./6_get-question-summary.md))
- `PATCH /api/questions/:id` - Update question text (this document)
- Future: `POST /api/questions/:id/regenerate` - Regenerate incorrect answers

### Answers

- Future: `PATCH /api/answers/:id` - Update answer text

### Quizzes

- `GET /api/quizzes` - List all quizzes
- `GET /api/quizzes/:id` - Get quiz with all questions
- `PATCH /api/quizzes/:id` - Update quiz properties ([Implementation Summary](./4_update-quiz-summary.md))
- `DELETE /api/quizzes/:id` - Delete quiz ([Implementation Summary](./5_delete-quiz-summary.md))

## Conclusion

The PATCH `/api/questions/:id` endpoint provides a secure and efficient way to update question text. Key achievements:

✅ **Security**: Robust IDOR protection through ownership verification  
✅ **Validation**: Comprehensive input validation with clear error messages  
✅ **Performance**: Optimized queries with proper indexing  
✅ **Logging**: Detailed logging for debugging and monitoring  
✅ **Testing**: Comprehensive manual test coverage  
✅ **Documentation**: Complete API documentation and examples

The implementation follows all coding best practices and is ready for production use once authentication is implemented.
