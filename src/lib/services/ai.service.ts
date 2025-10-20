import type { QuestionMetadata } from "../../types";

/**
 * AI Service - handles generation of incorrect answers for quiz questions
 * Currently uses mocks for development
 */

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
 * MOCK IMPLEMENTATION - returns hardcoded incorrect answers for development
 *
 * @param input - Question, correct answer, and optional parameters
 * @returns Array of 3 incorrect answers with metadata
 * @throws Error if AI generation fails
 */
export async function generateIncorrectAnswers(
  input: GenerateIncorrectAnswersInput
): Promise<GenerateIncorrectAnswersOutput> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const { question, correctAnswer, temperature = 0.7, seed } = input;

  // Mock prompt that would be sent to AI
  const prompt = `Generate 3 plausible but incorrect answers for the following question.
Question: ${question}
Correct Answer: ${correctAnswer}

The incorrect answers should be:
- Related to the topic
- Plausible enough to be distractors
- Clearly wrong to someone who knows the correct answer
- Of similar length and format to the correct answer`;

  // Mock incorrect answers based on common patterns
  const incorrectAnswersMap: Record<string, string[]> = {
    Mitochondria: ["Nucleus", "Ribosome", "Chloroplast"],
    Photosynthesis: ["Respiration", "Fermentation", "Glycolysis"],
    Cell: ["Tissue", "Organ", "Molecule"],
    "Deoxyribonucleic Acid": ["Ribonucleic Acid", "Deoxyribose Sugar", "Deoxygenated Nucleotide Acid"],
    Mitosis: ["Meiosis", "Binary Fission", "Cytokinesis"],
  };

  // Get incorrect answers or use generic ones
  const incorrectAnswers = incorrectAnswersMap[correctAnswer] || [
    "Answer Option A",
    "Answer Option B",
    "Answer Option C",
  ];

  return {
    incorrectAnswers,
    metadata: {
      model: "gemini-pro-mock",
      temperature,
      seed,
      prompt,
    },
  };
}
