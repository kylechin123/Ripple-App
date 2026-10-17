import { z } from "zod";
import { hasAnthropicKey, isDemoMode } from "@/lib/ai/client";
import { MIN_CONFIDENCE, verifyPhoto, type Verdict } from "@/lib/ai/verify";
import { distanceMeters, withinTarget } from "@/lib/geo";
import { DUPLICATE_THRESHOLD, dHash, hamming, toVisionJpeg } from "@/lib/phash";
import { attemptsUsed, awardSubmission, MAX_ATTEMPTS_PER_QUEST, PROOF_WINDOW_HOURS } from "@/lib/server/game";
import { HttpError, handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";
import type { Quest } from "@/lib/types";

export const maxDuration = 60;

const Body = z.object({
  quest_id: z.string().uuid(),
  photo_path: z.string().min(1),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  accuracy: z.number().min(0).nullable(),
  demo_location: z.boolean().optional(),
});

export const POST = handler(async (req) => {
  const profile = await requireProfile(req);
  const body = Body.parse(await req.json());
  const db = supabaseAdmin();

  // 1. Ownership, state, time window, rate limit
  const { data: q } = await db.from("quests").select("*").eq("id", body.quest_id).eq("user_id", profile.id).maybeSingle();
  if (!q) throw new HttpError(404, "Quest not found");
  const quest = q as Quest;
  if (quest.tier !== "act") throw new HttpError(400, "This quest isn't verified by photo");
  if (quest.status === "completed") throw new HttpError(409, "Already completed");
  if (quest.status !== "accepted" || !quest.accepted_at) throw new HttpError(409, "Start the quest first");
  if (Date.now() - new Date(quest.accepted_at).getTime() > PROOF_WINDOW_HOURS * 3600 * 1000) {
    throw new HttpError(410, `Proof must be submitted within ${PROOF_WINDOW_HOURS}h of starting. Reroll for a fresh quest.`);
  }
  if ((await attemptsUsed(quest.id)) >= MAX_ATTEMPTS_PER_QUEST) throw new HttpError(429, "Out of attempts for this quest");
  if (!body.photo_path.startsWith(`${profile.id}/`)) throw new HttpError(403, "That photo isn't yours");

  const reject = async (reason: string, extra: Record<string, unknown> = {}) => {
    await db.from("submissions").insert({
      quest_id: quest.id,
      user_id: profile.id,
      photo_path: body.photo_path,
      lat: body.lat,
      lng: body.lng,
      accuracy_m: body.accuracy,
      reject_reason: reason,
      ...extra,
    });
    const retriesLeft = MAX_ATTEMPTS_PER_QUEST - (await attemptsUsed(quest.id));
    return Response.json({ approved: false, reason, retriesLeft });
  };

  // 2. GPS (location-based quests only). The demo override is only honoured when DEMO_MODE is on.
  if (quest.verification === "photo_gps" && quest.target_lat != null && quest.target_lng != null) {
    const spoof = body.demo_location && isDemoMode();
    if (!spoof) {
      if (body.lat == null || body.lng == null) return reject("This quest needs your location. Allow location access and try again.");
      const d = distanceMeters(body.lat, body.lng, quest.target_lat, quest.target_lng);
      if (!withinTarget(d, body.accuracy)) {
        return reject(`You look about ${(d / 1000).toFixed(1)} km away from the quest location. Take the photo on site.`);
      }
    }
  }

  // 3. Download + duplicate check (catches re-used photos, even resized or re-compressed)
  const { data: file, error: dlErr } = await db.storage.from("proofs").download(body.photo_path);
  if (dlErr || !file) throw new HttpError(400, "Couldn't read the uploaded photo");
  const original = Buffer.from(await file.arrayBuffer());
  const hash = await dHash(original);
  const { data: prior } = await db.from("submissions").select("phash").not("phash", "is", null).neq("photo_path", body.photo_path);
  if ((prior ?? []).some((p) => hamming(p.phash as string, hash) <= DUPLICATE_THRESHOLD)) {
    return reject("This photo has already been used for a quest. Take a new one.", { phash: hash });
  }

  // 4. AI vision check
  let verdict: Verdict;
  if (hasAnthropicKey()) {
    try {
      verdict = await verifyPhoto(await toVisionJpeg(original), quest);
    } catch (err) {
      console.error("Photo verification failed", err);
      throw new HttpError(503, "Verification is temporarily unavailable. Your attempt wasn't used, so try again in a moment.");
    }
  } else if (isDemoMode()) {
    verdict = { matches_task: true, confidence: 1, reason: "Demo mode: AI check skipped.", looks_stock_or_reused: false };
  } else {
    throw new HttpError(503, "ANTHROPIC_API_KEY is not configured");
  }

  if (!verdict.matches_task || verdict.confidence < MIN_CONFIDENCE || verdict.looks_stock_or_reused) {
    return reject(verdict.reason, { phash: hash, ai_verdict: verdict });
  }

  // 5. Approve + award
  const { data: sub, error } = await db
    .from("submissions")
    .insert({ quest_id: quest.id, user_id: profile.id, photo_path: body.photo_path, phash: hash, lat: body.lat, lng: body.lng, accuracy_m: body.accuracy, ai_verdict: verdict })
    .select("id")
    .single();
  if (error) throw error;
  const award = await awardSubmission(sub.id, quest, profile.id);
  if (!award) throw new HttpError(409, "Already awarded");
  return Response.json({ ...award, reason: verdict.reason });
});
