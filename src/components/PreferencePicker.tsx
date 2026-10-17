"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LIMITS, TAG_PATTERN } from "@/data/preferences";
import { useI18n } from "@/i18n";

type Props = {
  /** Grouped options, or pass `options` for a flat list. */
  groups?: { label: string; options: string[] }[];
  options?: string[];
  value: string[];
  onChange: (next: string[]) => void;
  addPlaceholder?: string;
  /** Text on the closed dropdown when nothing is selected. */
  placeholder?: string;
};

/**
 * Searchable multi-select dropdown. Selected items show as removable chips;
 * typing something that isn't an option offers to add it as your own.
 */
export function PreferencePicker({ groups, options, value, onChange, placeholder, addPlaceholder }: Props) {
  const { t, opt } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const allGroups = groups ?? [{ label: "", options: options ?? [] }];
  const allOptions = allGroups.flatMap((g) => g.options);
  const selected = new Set(value.map((v) => v.toLowerCase()));
  const full = value.length >= LIMITS.maxPerList;

  // Close when tapping outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const toggle = (v: string) => {
    setHint(null);
    if (selected.has(v.toLowerCase())) onChange(value.filter((x) => x.toLowerCase() !== v.toLowerCase()));
    else if (full) setHint(t("picker.max", { n: LIMITS.maxPerList }));
    else onChange([...value, v]);
  };

  const q = query.trim().replace(/\s+/g, " ");
  // Match the English value or its translation.
  const matches = (o: string) => !q || o.toLowerCase().includes(q.toLowerCase()) || opt(o).toLowerCase().includes(q.toLowerCase());
  const exact = allOptions.find((o) => o.toLowerCase() === q.toLowerCase() || opt(o).toLowerCase() === q.toLowerCase());
  const canAddCustom = q.length > 0 && !exact && !selected.has(q.toLowerCase());

  const addCustom = () => {
    if (!q) return;
    if (q.length > LIMITS.maxLength) return setHint(t("picker.tooLong", { n: LIMITS.maxLength }));
    if (!TAG_PATTERN.test(q)) return setHint(t("picker.badChars"));
    if (full) return setHint(t("picker.max", { n: LIMITS.maxPerList }));
    if (exact) {
      if (!selected.has(exact.toLowerCase())) onChange([...value, exact]);
    } else if (!selected.has(q.toLowerCase())) onChange([...value, q]);
    setQuery("");
    setHint(null);
  };

  const custom = value.filter((v) => !allOptions.some((o) => o.toLowerCase() === v.toLowerCase()));
  const visibleGroups = allGroups.map((g) => ({ ...g, options: g.options.filter(matches) })).filter((g) => g.options.length);
  const visibleCustom = custom.filter(matches);

  return (
    <div ref={rootRef} className="relative">
      {/* Closed state: selected chips + toggle */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen(!open);
          setTimeout(() => searchRef.current?.focus(), 0);
        }}
        className={`flex min-h-14 w-full flex-wrap items-center gap-1.5 rounded-2xl border-2 bg-surface px-3 py-2 text-left transition ${open ? "border-brand" : "border-line hover:border-brand"}`}
      >
        {value.length === 0 && <span className="text-sm text-muted">{placeholder ?? t("picker.tap")}</span>}
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-grad px-2.5 py-1 text-xs font-semibold text-white">
            {opt(v)}
            <span
              role="button"
              tabIndex={0}
              aria-label={t("picker.remove", { v: opt(v) })}
              onClick={(e) => {
                e.stopPropagation();
                toggle(v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(v);
                }
              }}
              className="-mr-1 rounded-full px-1 hover:bg-white/25"
            >
              ×
            </span>
          </span>
        ))}
        <span className={`ml-auto text-lg text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div id={listId} className="animate-pop relative z-10 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_16px_40px_-12px_rgba(91,33,182,0.5)]">
          <div className="border-b border-line p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHint(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                } else if (e.key === "Escape") setOpen(false);
              }}
              maxLength={LIMITS.maxLength + 10}
              placeholder={`🔍 ${addPlaceholder ?? t("picker.search")}`}
              className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="max-h-72 overflow-y-auto p-1" role="listbox" aria-multiselectable>
            {canAddCustom && (
              <button type="button" onClick={addCustom} disabled={full} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-brand hover:bg-brand-soft disabled:opacity-50">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-grad text-xs text-white">+</span>
                {t("picker.add", { q })}
              </button>
            )}

            {visibleCustom.length > 0 && <Group label={t("picker.yourOwn")} options={visibleCustom} selected={selected} onToggle={toggle} />}
            {visibleGroups.map((g) => (
              <Group key={g.label || "all"} label={g.label ? opt(g.label) : ""} options={g.options} selected={selected} onToggle={toggle} />
            ))}
            {!canAddCustom && visibleGroups.length === 0 && visibleCustom.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted">{t("picker.noMatch")}</p>}
          </div>

          <div className="flex items-center justify-between border-t border-line px-3 py-2">
            <span className="text-xs text-muted">{hint ?? t("picker.count", { n: value.length, max: LIMITS.maxPerList })}</span>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white">
              {t("common.done")}
            </button>
          </div>
        </div>
      )}
      {!open && hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Group({ label, options, selected, onToggle }: { label: string; options: string[]; selected: Set<string>; onToggle: (v: string) => void }) {
  const { opt } = useI18n();
  return (
    <div className="py-1">
      {label && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>}
      {options.map((o) => {
        const on = selected.has(o.toLowerCase());
        return (
          <button
            key={o}
            type="button"
            role="option"
            aria-selected={on}
            onClick={() => onToggle(o)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${on ? "bg-brand-soft font-semibold text-brand-ink" : "hover:bg-surface-2"}`}
          >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] text-white ${on ? "border-transparent bg-grad" : "border-line"}`}>{on ? "✓" : ""}</span>
            {opt(o)}
          </button>
        );
      })}
    </div>
  );
}
