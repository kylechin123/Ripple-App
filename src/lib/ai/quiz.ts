import "server-only";
import { z } from "zod";
import { structuredCall } from "./client";

export const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer_idx: z.number(),
    }),
  ),
});
export type Quiz = z.infer<typeof QuizSchema>["questions"];

const SYSTEM = `You write short comprehension quizzes for a civic learning app.
Write exactly 4 multiple-choice questions, each with exactly 4 options and one correct answer (answer_idx is 0-based).
Every question must be answerable ONLY from the brief provided; don't rely on outside knowledge.
Make the wrong options plausible but clearly wrong to someone who read the brief. Vary the position of the correct answer.`;

export async function generateQuiz(brief: string): Promise<Quiz> {
  const { questions } = await structuredCall({ schema: QuizSchema, system: SYSTEM, content: `Brief:\n\n${brief}` });
  const clean = questions
    .filter((q) => q.options.length >= 2 && q.answer_idx >= 0 && q.answer_idx < q.options.length)
    .slice(0, 4);
  if (clean.length < 3) throw new Error("Quiz generation returned too few valid questions");
  return clean;
}

export const PASS_RATIO = 0.75;
