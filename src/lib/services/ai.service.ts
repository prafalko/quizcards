import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { QuestionMetadata, QuizletFlashcard } from "../../types";
import { ApiKeyError, ApiGenerationError, InvalidResponseDataError, ContentBlockedError, AppError } from "../errors";
import { createLogger, type LoggerService } from "./logger.service";
import {
  generateIncorrectAnswersResponseSchema,
  GeneratedQuizSchema,
  type GeneratedQuiz,
} from "../validators/ai.validator";

/**
 * AI Service - handles generation of structured data using Google Gemini
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private readonly modelName: string = "gemini-2.5-flash";
  private logger: LoggerService;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new ApiKeyError("GEMINI_API_KEY is not provided.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.logger = createLogger("GeminiService");
  }

  /**
   * Generates structured data in JSON format based on the provided Zod schema
   *
   * @param systemPrompt - Instruction for the model defining its role and general rules
   * @param userPrompt - Specific command from the user
   * @param schema - Zod schema defining the expected response structure
   * @param generationConfig - Optional generation configuration (temperature, seed, etc.)
   * @returns Promise resolving to an object conforming to the defined schema
   * @throws ApiKeyError, ApiGenerationError, InvalidResponseDataError, ContentBlockedError
   */
  async generateStructuredData<T extends z.ZodTypeAny>(
    systemPrompt: string,
    userPrompt: string,
    schema: T,
    generationConfig?: {
      temperature?: number;
      seed?: number;
    }
  ): Promise<z.infer<T>> {
    const config = {
      temperature: generationConfig?.temperature ?? 0.7,
      responseMimeType: "application/json",
    };

    this.logger.info("Starting Gemini API generation", {
      operation: "generateStructuredData",
      metadata: {
        modelName: this.modelName,
        temperature: config.temperature,
        seed: generationConfig?.seed,
      },
    });

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: config,
    });

    const prompt = this.buildPrompt(systemPrompt, userPrompt, schema);

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;

      // Handle blocked content or empty response
      if (!response.text) {
        const safetyRatings = response.promptFeedback?.safetyRatings;
        const blockReason = response.promptFeedback?.blockReason;

        this.logger.warn("Content blocked by safety filters", {
          operation: "generateStructuredData",
          metadata: {
            blockReason: blockReason || "UNKNOWN",
            safetyRatings,
          },
        });

        throw new ContentBlockedError(`Content blocked by safety filters. Reason: ${blockReason || "UNKNOWN"}`, {
          safetyRatings,
          blockReason,
        });
      }

      const text = response.text();
      const validatedData = this.validateAndParseResponse(text, schema);

      this.logger.info("Gemini API generation completed successfully", {
        operation: "generateStructuredData",
        metadata: {
          modelName: this.modelName,
          responseLength: text.length,
        },
      });

      return validatedData;
    } catch (error) {
      // Re-throw custom errors
      if (error instanceof AppError) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error("Gemini API generation error", {
        operation: "generateStructuredData",
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        metadata: {
          modelName: this.modelName,
          hasSystemPrompt: systemPrompt.length > 0,
          hasUserPrompt: userPrompt.length > 0,
        },
      });

      throw new ApiGenerationError("Failed to generate content from Gemini API", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Builds a complete, formatted prompt containing system instruction,
   * user query, and expected JSON schema description
   *
   * @param systemPrompt - System instruction
   * @param userPrompt - User query
   * @param schema - Zod schema to convert to JSON Schema
   * @returns Complete prompt as a string
   */
  private buildPrompt(systemPrompt: string, userPrompt: string, schema: z.ZodTypeAny): string {
    const jsonSchema = zodToJsonSchema(schema, "responseSchema");

    return `${systemPrompt}

IMPORTANT: Always respond in JSON format. Use the following JSON schema:
${JSON.stringify(jsonSchema, null, 2)}

---

User request:
${userPrompt}`;
  }

  /**
   * Parses text response from API (which should be JSON) and validates it
   * against the provided Zod schema
   *
   * @param response - Raw text response from Gemini model
   * @param schema - Zod schema for validation
   * @returns Parsed and validated object
   * @throws InvalidResponseDataError if response is not valid JSON or doesn't match schema
   */
  private validateAndParseResponse<T extends z.ZodTypeAny>(response: string, schema: T): z.infer<T> {
    try {
      const data = JSON.parse(response);
      const validationResult = schema.safeParse(data);

      if (!validationResult.success) {
        this.logger.error("Response validation failed", {
          operation: "validateAndParseResponse",
          error: {
            message: validationResult.error.message,
          },
          metadata: {
            validationErrors: validationResult.error.errors,
            responsePreview: response.substring(0, 200),
          },
        });

        throw new InvalidResponseDataError(`Response validation failed: ${validationResult.error.message}`, {
          originalResponse: response,
          validationErrors: validationResult.error.errors,
        });
      }

      return validationResult.data;
    } catch (error) {
      if (error instanceof InvalidResponseDataError) {
        throw error;
      }

      this.logger.error("JSON parsing failed", {
        operation: "validateAndParseResponse",
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
        metadata: {
          responsePreview: response.substring(0, 200),
        },
      });

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InvalidResponseDataError(`Failed to parse JSON response: ${errorMessage}`, {
        originalResponse: response,
      });
    }
  }
}

// Singleton instance
const geminiApiKey = import.meta.env.GEMINI_API_KEY;
export const geminiService = new GeminiService(geminiApiKey);

// ============================================================================
// Public API for generating incorrect answers
// ============================================================================

export interface GenerateIncorrectAnswersInput {
  question: string;
  correctAnswer: string;
  temperature?: number;
  seed?: number;
}

export interface GenerateIncorrectAnswersOutput {
  incorrectAnswers: string[];
  metadata: QuestionMetadata;
}

/**
 * Generates 3 incorrect answers for a given question and correct answer
 * Uses Google Gemini AI to generate plausible but incorrect distractors
 *
 * @param input - Question, correct answer, and optional parameters
 * @returns Array of 3 incorrect answers with metadata
 * @throws ApiKeyError, ApiGenerationError, InvalidResponseDataError, ContentBlockedError
 */
export async function generateIncorrectAnswers(
  input: GenerateIncorrectAnswersInput
): Promise<GenerateIncorrectAnswersOutput> {
  const { question, correctAnswer, temperature = 0.7, seed } = input;

  const logger = createLogger("AIService");
  logger.info("Generating incorrect answers", {
    operation: "generateIncorrectAnswers",
    metadata: {
      questionLength: question.length,
      correctAnswerLength: correctAnswer.length,
      temperature,
      hasSeed: seed !== undefined,
    },
  });

  // Define the system prompt for generating incorrect answers
  const systemPrompt = `You are an expert at creating multiple-choice quiz questions.
Your task is to generate plausible but incorrect answer options (distractors) for quiz questions.

Guidelines for creating distractors:
- They should be related to the topic and sound plausible
- They should be clearly wrong to someone who knows the correct answer
- They should be similar in length and format to the correct answer
- They should be at an appropriate difficulty level (not too obvious, not too obscure)
- Avoid joke answers or nonsensical options`;

  const userPrompt = `Generate exactly 3 incorrect answers (distractors) for this question:

Question: ${question}
Correct Answer: ${correctAnswer}

Return the incorrect answers as an array of strings.`;

  // Generate incorrect answers using Gemini with validated schema
  const result = await geminiService.generateStructuredData(
    systemPrompt,
    userPrompt,
    generateIncorrectAnswersResponseSchema,
    {
      temperature,
      seed,
    }
  );

  logger.info("Incorrect answers generated successfully", {
    operation: "generateIncorrectAnswers",
    metadata: {
      answersCount: result.incorrectAnswers.length,
      model: geminiService["modelName"],
    },
  });

  return {
    incorrectAnswers: result.incorrectAnswers,
    metadata: {
      model: geminiService["modelName"], // Access private field for metadata
      temperature,
      seed,
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      regenerated_at: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Public API for generating complete quiz from flashcards (batch processing)
// ============================================================================

export interface GenerateQuizFromFlashcardsInput {
  flashcards: QuizletFlashcard[];
  topic: string;
  temperature?: number;
  seed?: number;
}

export interface GenerateQuizFromFlashcardsOutput {
  quiz: GeneratedQuiz;
  metadata: {
    model: string;
    temperature: number;
    seed?: number;
    flashcardsCount: number;
    generatedAt: string;
  };
}

/**
 * Generates a complete quiz (title + questions with incorrect answers) from a list of flashcards
 * Uses Google Gemini AI to process all flashcards in a single batch request
 * This approach reduces API calls and prevents 429 rate limit errors
 *
 * @param input - Flashcards array, topic, and optional parameters
 * @returns Complete quiz with title and questions with all answers
 * @throws ApiKeyError, ApiGenerationError, InvalidResponseDataError, ContentBlockedError
 */
export async function generateQuizFromFlashcards(
  input: GenerateQuizFromFlashcardsInput
): Promise<GenerateQuizFromFlashcardsOutput> {
  const { flashcards, topic, temperature = 0.7, seed } = input;

  const logger = createLogger("AIService");
  logger.info("Generating quiz from flashcards in batch mode", {
    operation: "generateQuizFromFlashcards",
    metadata: {
      flashcardsCount: flashcards.length,
      topic,
      temperature,
      hasSeed: seed !== undefined,
    },
  });

  // Define the system prompt for generating complete quiz
  const systemPrompt = `You are an AI assistant specializing in creating high-quality multiple-choice quizzes.
Your primary task is to generate a complete quiz from a provided list of flashcards (term/definition pairs).

Your main objectives are:
1. Create a concise, catchy title for the quiz based on its topic and content.
2. For each flashcard, generate three plausible but incorrect answer options (distractors).

Please adhere to the following guidelines strictly:

**Content and Phrasing:**
- You may slightly rephrase the question (term) and the correct answer (definition) to improve clarity and ensure the question is self-contained. The core meaning must not be changed.
  - Example: A question "Egg disinfection" with answer "Fumigation with formalin vapor" can be improved to "How are eggs disinfected after collection?" with the answer "They are fumigated with formalin vapor."
- The generated distractors should match the complexity, length, and style of the correct answer.

**Language and Formatting:**
- Use the same language as the input flashcards.
- Maintain consistent formatting (e.g., punctuation, capitalization) across all answer options for a single question.

**Special Conditions:**
- If the correct answer provided is a meta-statement like "2 answers are correct" or "all answers are correct", you must generate the other answers to make this statement true.
  - Example: If the correct answer is "2 answers are correct", two of the three distractors you generate must also be factually correct, and one must be incorrect.
- If a question involves legal, cultural, or geographical context, assume it pertains to Poland unless specified otherwise.

**Distractor Quality:**
- Distractors must be relevant to the topic and plausible.
- They must be clearly incorrect to a person who knows the subject.
- Avoid joke answers or nonsensical options.`;

  const userPrompt = `Quiz topic: ${topic}

Generate a complete quiz based on the following flashcards.
For each flashcard, include the original question (term), the correct answer (definition), and generate exactly 3 incorrect answers.

Flashcards:
${flashcards.map((f, i) => `${i + 1}. Term: "${f.term}", Definition: "${f.definition}"`).join("\n")}

Return the quiz with a title and all questions with their answers.`;

  // Generate quiz using Gemini with validated schema
  const result = await geminiService.generateStructuredData(systemPrompt, userPrompt, GeneratedQuizSchema, {
    temperature,
    seed,
  });

  logger.info("Quiz generated successfully in batch mode", {
    operation: "generateQuizFromFlashcards",
    metadata: {
      questionsCount: result.questions.length,
      flashcardsCount: flashcards.length,
      model: geminiService["modelName"],
    },
  });

  return {
    quiz: result,
    metadata: {
      model: geminiService["modelName"],
      temperature,
      seed,
      flashcardsCount: flashcards.length,
      generatedAt: new Date().toISOString(),
    },
  };
}
