import { z } from "zod";
import { chromium, type Response } from "playwright";
import type { QuizletSet } from "../../types";
import {
  InvalidQuizletUrlError,
  QuizletApiError,
  DataValidationError,
  QuizletNotFoundError,
  QuizletPrivateError,
  QuizletEmptyError,
  QuizletScraperFailedError,
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
 * Fetches raw data from Quizlet WebAPI using Playwright
 * Uses a real browser to bypass anti-bot protections
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
  const apiUrl = `${baseUrl}?${params.toString()}`;

  let browser;
  try {
    // Launch browser in windowed mode (headless: false) to avoid anti-bot detection
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled", // Hide automation flags
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
      locale: "en-US",
    });

    if (import.meta.env.QUIZLET_COOKIE) {
      await context.addCookies([
        {
          name: "cf_clearance",
          value: import.meta.env.QUIZLET_COOKIE,
          domain: ".quizlet.com",
          path: "/",
        },
      ]);
    }

    const page = await context.newPage();

    // Set up response interception
    let apiResponse: QuizletApiResponse | null = null;
    let responseStatus = 0;

    page.on("response", async (response: Response) => {
      const url = response.url();
      // Check if this is the API response we're looking for
      if (url.includes("studiable-item-documents") && url.includes(setId)) {
        responseStatus = response.status();
        try {
          const data = await response.json();
          apiResponse = data;
        } catch {
          // Ignore JSON parse errors
        }
      }
    });

    // Navigate to the Quizlet set page to trigger API calls
    const quizletPageUrl = `https://quizlet.com/${setId}`;
    const navigationResponse = await page.goto(quizletPageUrl, {
      waitUntil: "networkidle",
      timeout: 10000,
    });

    // Check if page loaded successfully
    if (!navigationResponse) {
      throw new QuizletApiError("Failed to load Quizlet page", 502, {
        url: quizletPageUrl,
      });
    }

    // If we caught the API response during page load, return it
    if (apiResponse) {
      await browser.close();

      // Handle HTTP errors
      if (responseStatus === 404) {
        throw new QuizletNotFoundError(setId);
      }
      if (responseStatus === 403) {
        throw new QuizletPrivateError(setId);
      }
      if (responseStatus >= 400) {
        throw new QuizletApiError(`HTTP ${responseStatus}`, responseStatus, {
          url: apiUrl,
          status: responseStatus,
        });
      }

      return apiResponse;
    }

    // If API call wasn't intercepted, try direct API call through the browser
    const response = await page.goto(apiUrl, {
      waitUntil: "networkidle",
      timeout: 10000,
    });

    if (!response) {
      await browser.close();
      throw new QuizletApiError("Failed to fetch API data", 502, {
        url: apiUrl,
      });
    }

    // Handle HTTP errors
    if (response.status() === 404) {
      await browser.close();
      throw new QuizletNotFoundError(setId);
    }
    if (response.status() === 403) {
      await browser.close();
      throw new QuizletPrivateError(setId);
    }
    if (!response.ok()) {
      await browser.close();
      throw new QuizletApiError(`HTTP ${response.status()}: ${response.statusText()}`, response.status(), {
        url: apiUrl,
        status: response.status(),
        statusText: response.statusText(),
      });
    }

    const data = await response.json();
    await browser.close();
    return data;
  } catch (error) {
    // Clean up browser
    if (browser) {
      await browser.close();
    }

    // Re-throw our custom errors
    if (
      error instanceof QuizletNotFoundError ||
      error instanceof QuizletPrivateError ||
      error instanceof QuizletApiError
    ) {
      throw error;
    }

    // Handle Playwright/network errors - throw scraper failed error with API URL for fallback
    throw new QuizletScraperFailedError(apiUrl, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Gets the API URL for a Quizlet set ID
 * Used for fallback when scraper fails
 * @param setId - Quizlet set ID
 * @returns API URL
 */
export function getQuizletApiUrl(setId: string): string {
  const baseUrl = "https://quizlet.com/webapi/3.9/studiable-item-documents";
  const params = new URLSearchParams({
    "filters[studiableContainerId]": setId,
    "filters[studiableContainerType]": "1",
    perPage: "1000",
    page: "1",
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parses Quizlet JSON response directly without scraping
 * Used as fallback when scraper fails
 * @param jsonData - Raw JSON response from Quizlet API
 * @param url - Original Quizlet URL (for title extraction)
 * @returns QuizletSet with flashcards
 * @throws DataValidationError if JSON structure is invalid
 * @throws QuizletEmptyError if set contains no flashcards
 */
export function parseQuizletJson(jsonData: unknown, url: string): QuizletSet {
  const setId = extractQuizletSetId(url);
  const title = _extractTitleFromUrl(url);
  return _transformApiResponse(jsonData, title, setId);
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
