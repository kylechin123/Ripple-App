import "server-only";
import { z } from "zod";
import { structuredCall } from "./client";

export const VerdictSchema = z.object({
  matches_task: z.boolean(),
  confidence: z.number(),
  reason: z.string(),
  looks_stock_or_reused: z.boolean(),
});
export type Verdict = z.infer<typeof VerdictSchema>;

export const MIN_CONFIDENCE = 0.7;

const SYSTEM = `You verify photo proof for Ripple, a civic volunteering app. A user claims the photo shows them completing a task.
Decide whether the photo plausibly shows the task completed by the user, recently.
- matches_task: true only if the photo shows evidence of THIS task (e.g. a filled litter bag for a cleanup, a printed or on-screen flyer for a design task, a submitted report confirmation for a report task).
- confidence: 0 to 1.
- looks_stock_or_reused: true if it looks like a stock photo, a watermarked image, a photo of another screen showing someone else's photo, or an image downloaded from the web. Screenshots ARE acceptable for code, design and report tasks.
- reason: one friendly sentence shown to the user explaining the decision. If rejecting, say what a passing photo would show.
Be fair: a real, slightly blurry phone photo of the right thing should pass.`;

export async function verifyPhoto(jpeg: Buffer, quest: { title: string; task: string; task_type: string }): Promise<Verdict> {
  return structuredCall({
    schema: VerdictSchema,
    system: SYSTEM,
    effort: "medium",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
      { type: "text", text: `Task title: ${quest.title}\nTask type: ${quest.task_type}\nTask: ${quest.task}` },
    ],
  });
}
