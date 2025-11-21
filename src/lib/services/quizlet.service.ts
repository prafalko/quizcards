import { z } from "zod";
import type { QuizletSet } from "../../types";
import {
  InvalidQuizletUrlError,
  QuizletApiError,
  DataValidationError,
  QuizletNotFoundError,
  QuizletPrivateError,
  QuizletEmptyError,
} from "../errors";
/**
 * Quizlet Service - handles fetching flashcards from Quizlet
 * Communicates with Quizlet WebAPI to retrieve public flashcard sets
 */
// ============================================================================
// Zod Schemas for API Response Validation
// ============================================================================
/**
 * Schema for a single media item containing plainText
 */
const MediaItemSchema = z.object({
  type: z.number(),
  plainText: z.string(),
  languageCode: z.string().optional(),
  ttsUrl: z.string().optional(),
  ttsSlowUrl: z.string().optional(),
  richText: z.null().optional(),
});
/**
 * Schema for a card side (term or definition)
 */
const CardSideSchema = z.object({
  sideId: z.number(),
  label: z.string(),
  media: z.array(MediaItemSchema),
  distractors: z.array(z.unknown()),
});
/**
 * Schema for a single studiable item (flashcard)
 */
const StudiableItemSchema = z.object({
  id: z.number(),
  studiableContainerType: z.number(),
  studiableContainerId: z.number(),
  type: z.number(),
  rank: z.number(),
  creatorId: z.number(),
  timestamp: z.number(),
  lastModified: z.number(),
  isDeleted: z.boolean(),
  cardSides: z.tuple([CardSideSchema, CardSideSchema]),
});
/**
 * Schema for the complete Quizlet API response
 */
const QuizletApiResponseSchema = z.object({
  responses: z.array(
    z.object({
      models: z.object({
        studiableItem: z.array(StudiableItemSchema),
      }),
      paging: z
        .object({
          total: z.number(),
          page: z.number(),
          perPage: z.number(),
          token: z.string(),
        })
        .optional(),
    })
  ),
});
type QuizletApiResponse = z.infer<typeof QuizletApiResponseSchema>;
// ============================================================================
// Private Helper Functions
// ============================================================================
/**
 * Extracts title from Quizlet URL slug
 * Converts hyphens to spaces and removes "flash-cards" suffix
 * @param url - Full Quizlet URL
 * @returns Cleaned title or default title
 */
function _extractTitleFromUrl(url: string): string {
  // Match the slug part after the ID: quizlet.com/{lang?}/{id}/{slug}/
  const regex = /quizlet\.com\/(?:[a-z]{2}\/)?(\d+)\/([a-zA-Z0-9-]+)/;
  const match = url.match(regex);
  if (!match || !match[2]) {
    return "My quizlet set";
  }
  const slug = match[2];
  // Clean up the slug: remove "flash-cards", replace hyphens with spaces, capitalize
  let title = slug
    .replace(/-flash-cards$/, "")
    .replace(/-/g, " ")
    .trim();
  // Capitalize first letter of each word
  title = title.replace(/\b\w/g, (char) => char.toUpperCase());
  return title || "My quizlet set";
}
/**
 * Fetches raw data from Quizlet WebAPI
 * @param setId - Quizlet set ID
 * @returns Raw API response
 * @throws QuizletApiError for network or API errors
 * @throws QuizletNotFoundError if set doesn't exist
 * @throws QuizletPrivateError if set is private
 */
async function _fetchQuizletData(setId: string): Promise<QuizletApiResponse> {
  const baseUrl = "https://quizlet.com/webapi/3.9/studiable-item-documents";
  const params = new URLSearchParams({
    "filters[studiableContainerId]": setId,
    "filters[studiableContainerType]": "1",
    perPage: "1000",
    page: "1",
  });
  const url = `${baseUrl}?${params.toString()}`;
  // Zdefiniuj nagłówki, które mają naśladować przeglądarkę
  const requestHeaders = new Headers();
  requestHeaders.append(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
  );
  // To jest kluczowe, aby pokazać, że akceptujesz odpowiedź JSON
  requestHeaders.append("Accept", "application/json, text/plain, */*");
  // Dodaj języki, które preferujesz
  requestHeaders.append("Accept-Language", "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7");
  // Możesz rozważyć dodanie również innych nagłówków, jeśli samo User-Agent nie wystarczy
  // requestHeaders.append("Accept", "application/json");
  // requestHeaders.append("Accept-Language", "en-US,en;q=0.9");
  const quizletCookie = import.meta.env.QUIZLET_COOKIE;
  requestHeaders.append("Cookie", `qlts=${quizletCookie}`);
  try {
    // Dodaj obiekt 'headers' do opcji zapytania fetch
    const response = await fetch(url, {
      method: "GET",
      headers: requestHeaders,
    });
    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 404) {
        throw new QuizletNotFoundError(setId);
      }
      if (response.status === 403) {
        // Ten błąd powinien teraz zniknąć dla publicznych zestawów!
        throw new QuizletPrivateError(setId);
      }
      throw new QuizletApiError(`HTTP ${response.status}: ${response.statusText}`, response.status, {
        url,
        status: response.status,
        statusText: response.statusText,
      });
    }
    const data = await response.json();
    return data;
  } catch (error) {
    // Re-throw our custom errors
    if (
      error instanceof QuizletNotFoundError ||
      error instanceof QuizletPrivateError ||
      error instanceof QuizletApiError
    ) {
      throw error;
    }
    // Handle network errors
    throw new QuizletApiError("Network request failed", 502, {
      originalError: error instanceof Error ? error.message : String(error),
      url,
    });
  }
}
/**
 * Transforms raw Quizlet API response into QuizletSet format
 * @param data - Raw API response
 * @param title - Extracted title from URL
 * @param setId - Quizlet set ID
 * @returns Formatted QuizletSet
 * @throws DataValidationError if response structure is invalid
 * @throws QuizletEmptyError if set contains no flashcards
 */
function _transformApiResponse(data: unknown, title: string, setId: string): QuizletSet {
  // Validate the response structure with Zod
  const parseResult = QuizletApiResponseSchema.safeParse(data);
  if (!parseResult.success) {
    throw new DataValidationError("Invalid API response structure", {
      zodErrors: parseResult.error.errors,
      receivedData: data,
    });
  }
  const validatedData = parseResult.data;
  // Extract studiable items
  if (validatedData.responses.length === 0 || !validatedData.responses[0].models.studiableItem) {
    throw new QuizletEmptyError(setId);
  }
  const studiableItems = validatedData.responses[0].models.studiableItem;
  if (studiableItems.length === 0) {
    throw new QuizletEmptyError(setId);
  }
  // Transform to flashcards format
  const flashcards = studiableItems.map((item) => {
    // Extract term (cardSides[0]) and definition (cardSides[1])
    const termMedia = item.cardSides[0].media[0];
    const definitionMedia = item.cardSides[1].media[0];
    return {
      term: termMedia.plainText,
      definition: definitionMedia.plainText,
    };
  });
  return {
    id: setId,
    title,
    flashcards,
  };
}
// ============================================================================
// Public API
// ============================================================================
/**
 * Extracts the Quizlet set ID from a Quizlet URL
 * Supports URLs with optional language codes: quizlet.com/{lang}/{id}/ or quizlet.com/{id}/
 * @param url - Full Quizlet set URL
 * @returns Quizlet set ID
 * @throws InvalidQuizletUrlError if URL format is invalid
 */
export function extractQuizletSetId(url: string): string {
  // Match either: quizlet.com/{digits}/ or quizlet.com/{2-letter-lang}/{digits}/
  const regex = /quizlet\.com\/(?:[a-z]{2}\/)?(\d+)\//;
  const match = url.match(regex);
  if (!match || !match[1]) {
    throw new InvalidQuizletUrlError(url);
  }
  return match[1];
}
/**
 * Fetches flashcards from a Quizlet set
 * Main public function to retrieve a complete Quizlet set with all flashcards
 *
 * @param setId - Quizlet set ID
 * @returns QuizletSet with flashcards
 * @throws InvalidQuizletUrlError for invalid URL format
 * @throws QuizletNotFoundError if set doesn't exist
 * @throws QuizletPrivateError if set is private
 * @throws QuizletEmptyError if set has no flashcards
 * @throws QuizletApiError for API communication errors
 * @throws DataValidationError for invalid API response structure
 */
export async function fetchQuizletSet(setId: string): Promise<QuizletSet> {
  // Note: This function accepts setId directly, but in practice it should be called
  // after extractQuizletSetId() and _extractTitleFromUrl() when starting from a URL
  // For this function to work properly with a title, we need the full URL
  // This is a limitation of the current API design
  // The title will be set to a default value
  const title = "My quizlet set";
  // Fetch raw data from Quizlet API
  const apiResponse = await _fetchQuizletData(setId);
  // Transform and return the formatted data
  return _transformApiResponse(apiResponse, title, setId);
}
/**
 * Fetches flashcards from a Quizlet set using full URL
 * This is the recommended way to fetch a Quizlet set as it preserves the title
 *
 * @param url - Full Quizlet set URL
 * @returns QuizletSet with flashcards and proper title
 * @throws InvalidQuizletUrlError for invalid URL format
 * @throws QuizletNotFoundError if set doesn't exist
 * @throws QuizletPrivateError if set is private
 * @throws QuizletEmptyError if set has no flashcards
 * @throws QuizletApiError for API communication errors
 * @throws DataValidationError for invalid API response structure
 */
export async function fetchQuizletSetFromUrl(url: string): Promise<QuizletSet> {
  // Extract set ID and title from URL
  const setId = extractQuizletSetId(url);
  const title = _extractTitleFromUrl(url);
  // Fetch raw data from Quizlet API
  const apiResponse = await _fetchQuizletData(setId);
  // Transform and return the formatted data
  return _transformApiResponse(apiResponse, title, setId);
}
