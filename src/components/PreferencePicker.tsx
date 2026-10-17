"use client";

import { useState } from "react";
import { LIMITS, TAG_PATTERN } from "@/data/preferences";
import { Chip } from "./ui";

type Props = {
  /** Grouped options, or pass `options` for a flat list. */
  groups?: { label: string; options: string[] }[];
  options?: string[];
  value: string[];
  onChange: (next: string[]) => void;
  addPlaceholder?: string;
};

/** Chip picker with an "Add your own" box. Used by onboarding and the preferences editor. */
export function PreferencePicker({ groups, options, value, onChange, addPlaceholder = "Add your own" }: Props) {
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const allGroups = groups ?? [{ label: "", options: options ?? [] }];
  const presets = new Set(allGroups.flatMap((g) => g.options.map((o) => o.toLowerCase())));
  const selected = new Set(value.map((v) => v.toLowerCase()));
  // Saved values that aren't presets (custom entries, or options renamed in the future) stay visible.
  const custom = value.filter((v) => !presets.has(v.toLowerCase()));
  const full = value.length >= LIMITS.maxPerList;

  const toggle = (v: string) => {
    setHint(null);
    if (selected.has(v.toLowerCase())) onChange(value.filter((x) => x.toLowerCase() !== v.toLowerCase()));
    else if (full) setHint(`You can pick up to ${LIMITS.maxPerList}.`);
    else onChange([...value, v]);
  };

  const add = () => {
    const v = draft.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (v.length > LIMITS.maxLength) return setHint(`Keep it under ${LIMITS.maxLength} characters.`);
    if (!TAG_PATTERN.test(v)) return setHint("Use letters, numbers and simple punctuation only.");
    if (selected.has(v.toLowerCase())) {
      setDraft("");
      return setHint("Already added.");
    }
    if (full) return setHint(`You can pick up to ${LIMITS.maxPerList}.`);
    const preset = allGroups.flatMap((g) => g.options).find((o) => o.toLowerCase() === v.toLowerCase());
    onChange([...value, preset ?? v]);
    setDraft("");
    setHint(null);
  };

  return (
    <div className="space-y-4">
      {allGroups.map((g) => (
        <div key={g.label || "all"}>
          {g.label && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</p>}
          <div className="flex flex-wrap gap-2">
            {g.options.map((o) => (
              <Chip key={o} active={selected.has(o.toLowerCase())} onClick={() => toggle(o)}>
                {o}
              </Chip>
            ))}
          </div>
        </div>
      ))}

      {custom.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Your own</p>
          <div className="flex flex-wrap gap-2">
            {custom.map((c) => (
              <Chip key={c} active onClick={() => toggle(c)} aria-label={`Remove ${c}`}>
                {c} ×
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            maxLength={LIMITS.maxLength + 10}
            placeholder={addPlaceholder}
            disabled={full}
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
          />
          <button
            type="button"
            onClick={add}
            disabled={full || !draft.trim()}
            className="rounded-xl bg-brand-soft px-4 text-sm font-semibold text-brand-ink disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          {hint ?? `${value.length}/${LIMITS.maxPerList} selected`}
        </p>
      </div>
    </div>
  );
}
