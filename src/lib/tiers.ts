import type { MessageKey } from "@/i18n/en";
import type { Tier } from "./points";

export const TIER_META: Record<Tier, { label: MessageKey; icon: string }> = {
  learn: { label: "tier.learn", icon: "📖" },
  act: { label: "tier.act", icon: "🛠️" },
  lead: { label: "tier.lead", icon: "📣" },
};
