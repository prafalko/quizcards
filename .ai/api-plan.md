# REST API Plan for QuizCards

## 1. Resources

The API is organized around the following main resources that correspond to database tables:
- **Users** (`users` table) - User accounts and authentication data managed through Supabase Auth. Not directly modifiable via custom API endpoints.
- **Quizzes** (`quizzes` table) - Collections of quiz questions created by users
- **Questions** (`quiz_questions` table) - Individual questions within a quiz
- **Answers** (`answers` table) - Answer options for questions (4 per question, 1 correct)

## 2. API Endpoints

### 2.2. Quiz Endpoints

#### List User Quizzes
- **Method:** GET
- **Path:** `/api/quizzes`
- **Description:** Retrieve all quizzes for the authenticated user, sorted by newest first
- **Query Parameters:**
  - `status` (optional, string) - Filter by quiz status ('draft', 'published')
- **Success Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "title": "Biology Flashcards Quiz",
    "status": "published",
    "source_url": "https://quizlet.com/...",
    "quizlet_set_id": "12345",
    "question_count": 25,
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-01-20T10:00:00Z"
  }
]
```
- **Error Responses:**
  - 400 Bad Request: Invalid query parameters

#### Get Quiz Details
- **Method:** GET
- **Path:** `/api/quizzes/:id`
- **Description:** Retrieve detailed information about a specific quiz, including all questions and answers
- **Success Response (200 OK):**
```json
{
  "id": "uuid",
  "title": "Biology Flashcards Quiz",
  "status": "published",
  "source_url": "https://quizlet.com/...",
  "quizlet_set_id": "12345",
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T10:00:00Z",
  "questions": [
    {
      "id": "uuid",
      "question_text": "What is photosynthesis?",
      "metadata": {
        "model": "gemini-pro",
        "temperature": 0.7,
        "seed": 12345,
        "prompt": "Generate 3 incorrect answers..."
      },
      "created_at": "2025-01-20T10:00:00Z",
      "updated_at": "2025-01-20T10:00:00Z",
      "answers": [
        {
          "id": "uuid",
          "answer_text": "The process by which plants convert light energy into chemical energy",
          "is_correct": true
        },
        {
          "id": "uuid",
          "answer_text": "The process of cellular respiration in plants",
          "is_correct": false
        },
        {
          "id": "uuid",
          "answer_text": "The movement of water through plant cells",
          "is_correct": false
        },
        {
          "id": "uuid",
          "answer_text": "The reproduction process in flowering plants",
          "is_correct": false
        }
      ]
    }
  ]
}
```
- **Error Responses:**
  - 404 Not Found: Quiz does not exist

#### Create Quiz from Quizlet URL
- **Method:** POST
- **Path:** `/api/quizzes/generate`
- **Description:** Import flashcards from a public Quizlet set and generate a quiz with AI-generated incorrect answers
- **Request Body:**
```json
{
  "source_url": "https://quizlet.com/123456789/biology-quiz-flash-cards/",
  "title": "My Biology Quiz" // optional, defaults to Quizlet set title
}
```
- **Success Response (201 Created):**
```json
{
  "id": "uuid",
  "title": "Biology Flashcards Quiz",
  "status": "published",
  "source_url": "https://quizlet.com/...",
  "quizlet_set_id": "123456789",
  "question_count": 25,
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T10:00:00Z"
}
```
- **Error Responses:**
  - 400 Bad Request: Invalid URL format or missing source_url
  - 403 Forbidden: Quizlet set is private
  - 404 Not Found: Quizlet set does not exist
  - 422 Unprocessable Entity: Quizlet set is empty (no flashcards)
  - 500 Internal Server Error: AI generation failed

#### Update Quiz
- **Method:** PATCH
- **Path:** `/api/quizzes/:id`
- **Description:** Update quiz properties (currently only title)
- **Request Body:**
```json
{
  "title": "Updated Quiz Title"
}
```
- **Success Response (200 OK):**
```json
{
  "id": "uuid",
  "title": "Updated Quiz Title",
  "status": "published",
  "source_url": "https://quizlet.com/...",
  "quizlet_set_id": "12345",
  "question_count": 25,
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T11:30:00Z"
}
```
- **Error Responses:**
  - 400 Bad Request: Invalid request body or title exceeds 255 characters
  - 404 Not Found: Quiz does not exist

#### Delete Quiz
- **Method:** DELETE
- **Path:** `/api/quizzes/:id`
- **Description:** Permanently delete a quiz and all associated questions and answers
- **Success Response (204 No Content)**
- **Error Responses:**
  - 404 Not Found: Quiz does not exist

### 2.3. Question Endpoints
#### Get Question
- **Method:** GET
- **Path:** `/api/questions/:id`
- **Description:** Retrieve a specific question with its answers and metadata
- **Success Response (200 OK):**
```json
{
  "id": "uuid",
  "question_text": "What is photosynthesis?",
  "metadata": {
  "model": "gemini-pro",
  "temperature": 0.7,
  "seed": 12345,
  "prompt": "Generate 3 incorrect answers..."
  },
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T10:00:00Z",
  "answers": [
    {
        "id": "uuid",
        "answer_text": "The process by which plants convert light energy into chemical energy",
        "is_correct": true
    },
    {
        "id": "uuid",
        "answer_text": "The process of cellular respiration in plants",
        "is_correct": false
    },
    {
        "id": "uuid",
        "answer_text": "The movement of water through plant cells",
        "is_correct": false
    },
    {
        "id": "uuid",
        "answer_text": "The reproduction process in flowering plants",
        "is_correct": false
    }
  ]
}
```
- **Error Responses:**
  - 404 Not Found: Question does not exist

#### Update Question
- **Method:** PATCH
- **Path:** `/api/questions/:id`
- **Description:** Update question text and/or answers
- **Request Body:**
```json
{
  "question_text": "Updated question text?",
  "answers": [
    {
      "id": "uuid",
      "answer_text": "Updated correct answer",
      "is_correct": true
    },
    {
      "id": "uuid",
      "answer_text": "Updated incorrect answer 1",
      "is_correct": false
    },
    {
      "id": "uuid",
      "answer_text": "Updated incorrect answer 2",
      "is_correct": false
    },
    {
      "id": "uuid",
      "answer_text": "Updated incorrect answer 3",
      "is_correct": false
    }
  ]
}
```
- **Success Response (200 OK):**
```json
{
  "id": "uuid",
  "question_text": "Updated question text?",
  "metadata": {
    "model": "gemini-pro",
    "temperature": 0.7,
    "seed": 12345
  },
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T11:30:00Z",
  "answers": [
    {
      "id": "uuid",
      "answer_text": "Updated correct answer",
      "is_correct": true
    },
    {
      "id": "uuid",
      "answer_text": "Updated incorrect answer 1",
      "is_correct": false
    },
    {
      "id": "uuid",
      "answer_text": "Updated incorrect answer 2",
      "is_correct": false
    },
    {
      "id": "uuid",
      "answer_text": "Updated incorrect answer 3",
      "is_correct": false
    }
  ]
}
```
- **Error Responses:**
  - 400 Bad Request: Invalid request body, question_text exceeds 2048 characters, answer_text exceeds 512 characters, or invalid answer count (must be exactly 4)
  - 404 Not Found: Question does not exist
  - 422 Unprocessable Entity: Must have exactly 1 correct answer

#### Regenerate Question Answers
- **Method:** POST
- **Path:** `/api/questions/:id/regenerate`
- **Description:** Generate new AI-powered incorrect answers for a question, keeping the question text and correct answer unchanged
- **Request Body:**
```json
{
  "temperature": 0.7, // optional, default 0.7
  "seed": 12345 // optional, for reproducibility
}
```
- **Success Response (200 OK):**
```json
{
  "id": "uuid",
  "question_text": "What is photosynthesis?",
  "metadata": {
    "model": "gemini-pro",
    "temperature": 0.7,
    "seed": 67890,
    "prompt": "Generate 3 incorrect answers...",
    "regenerated_at": "2025-01-20T11:30:00Z"
  },
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T11:30:00Z",
  "answers": [
    {
      "id": "uuid",
      "answer_text": "The process by which plants convert light energy into chemical energy",
      "is_correct": true
    },
    {
      "id": "uuid",
      "answer_text": "The breakdown of glucose in mitochondria",
      "is_correct": false
    },
    {
      "id": "uuid",
      "answer_text": "The transport of nutrients through xylem and phloem",
      "is_correct": false
    },
    {
      "id": "uuid",
      "answer_text": "The process of carbon fixation in the Calvin cycle",
      "is_correct": false
    }
  ]
}
```
- **Error Responses:**
  - 404 Not Found: Question does not exist
  - 500 Internal Server Error: AI generation failed

#### Delete Question
- **Method:** DELETE
- **Path:** `/api/questions/:id`
- **Description:** Permanently delete a question and all associated answers
- **Success Response (204 No Content)**
- **Error Responses:**
  - 404 Not Found: Question does not exist

## 3. Rate Limiting

- **General endpoints**: 100 requests per minute per IP
- **AI generation endpoints** (`/api/quizzes/generate`, `/api/questions/:id/regenerate`): 10 requests per minute per IP
- **Rate limit headers** included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Timestamp when the rate limit resets

## 4. Validation and Business Logic

### 4.1. Quiz Validation Rules

- **Title**:
  - Required when explicitly provided
  - Maximum length: 255 characters
  - Default: Quizlet set title when generating from URL
- **Source URL**:
  - Must be a valid Quizlet URL format
  - Must point to a public set
  - Maximum length: 2048 characters
- **Status**:
  - Must be one of: 'draft', 'published'
  - Default: 'draft'

### 4.2. Question Validation Rules

- **Question text**:
  - Required
  - Maximum length: 2048 characters
  - Minimum length: 1 character (after trimming whitespace)
- **Metadata**:
  - Must be valid JSON object
  - Should contain: model, temperature, seed, prompt (for AI-generated questions)
- **Answer count**:
  - Must have exactly 4 answers
  - Exactly 1 answer must have `is_correct = true`
  - Enforced by database unique index: `CREATE UNIQUE INDEX unique_correct_answer ON answers(question_id) WHERE is_correct = TRUE`

### 4.3. Answer Validation Rules

- **Answer text**:
  - Required
  - Maximum length: 512 characters
  - Minimum length: 1 character (after trimming whitespace)
- **is_correct flag**:
  - Required boolean
  - Only one answer per question can have `is_correct = true`

### 4.4. Business Logic Implementation

#### Quizlet Import and AI Generation

1. **URL Validation**: Verify the URL points to a valid, public Quizlet set
2. **Flashcard Import**: Extract all flashcards (term/definition pairs) from Quizlet
3. **Question Creation**: For each flashcard:
   - Term becomes the question text
   - Definition becomes the correct answer
4. **AI Answer Generation**: For each question:
   - Call Gemini API with prompt including question and correct answer
   - Generate 3 contextually relevant but incorrect answers
   - Store generation metadata (model, temperature, seed, prompt)
5. **Quiz Persistence**: Save quiz, questions, and answers in database transaction

#### Answer Regeneration

1. **Fetch Question**: Retrieve question with current correct answer
2. **Preserve Question and Correct Answer**: Keep original question text and correct answer unchanged
3. **Generate New Incorrect Answers**: Call Gemini API to generate 3 new incorrect answers
4. **Update Database**: Delete old incorrect answers, insert new ones, update metadata
5. **Track Changes**: Store regeneration timestamp in metadata

#### Quiz Session Management

1. **Randomization**: 
   - Shuffle question order using Fisher-Yates algorithm
   - Shuffle answer order for each question independently
2. **Progress Tracking**: Store user's answers in browser local storage or session state
3. **Score Calculation**: 
   - Compare user's selected answer_id with correct answer_id
   - Calculate percentage: (correct_answers / total_questions) * 100
4. **Results Compilation**: Present all questions with user answers and correct answers

#### Question Editing

1. **In-place Editing**: First answer is always treated as correct in edit mode
2. **Validation**: Ensure exactly 4 answers before saving
3. **Metadata Preservation**: Keep original AI generation metadata unless answers are regenerated
4. **Atomic Updates**: Update question and all answers in a single database transaction

### 4.5. Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // optional, additional context
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource does not exist
- `VALIDATION_ERROR`: Request validation failed
- `QUIZLET_PRIVATE`: Quizlet set is not public
- `QUIZLET_NOT_FOUND`: Quizlet set does not exist
- `QUIZLET_EMPTY`: Quizlet set has no flashcards
- `AI_GENERATION_FAILED`: AI service error
- `RATE_LIMIT_EXCEEDED`: Too many requests

### 4.6. Success Metrics Tracking

To support the metrics defined in the PRD:

- **MS-01 (AI Acceptance Rate)**: Track whether questions are modified before first quiz completion
  - Store `first_accessed_at` and `last_modified_at` timestamps on questions
  - Flag questions as "ai_accepted" if not modified before publishing the quiz (change of the quiz' status from draft to published)
- **MS-02 (AI-Generated Questions Ratio)**: Track question origin
  - Store `generation_source` in metadata ('ai' vs 'manual')
  - All questions in MVP are 'ai' generated


