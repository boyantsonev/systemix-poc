"use client";

import { useState } from "react";

export interface HypothesisFormInitial {
  id?: string;
  section?: string;
  hypothesis?: string;
  icp?: string;
  status?: string;
  variants?: Record<string, string>;
  evidencePosthog?: string;
}

export interface HypothesisFormPayload {
  id?: string;
  section: string;
  hypothesis: string;
  icp: string;
  status: string;
  variants: Record<string, string>;
  evidencePosthog: string;
}

const STATUS_OPTIONS = ["running", "complete", "archived"];

const inputCls =
  "w-full bg-background border border-border rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors";
const labelCls =
  "text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-1.5 block";

export function HypothesisEditForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  saving,
  error,
}: {
  mode: "create" | "edit";
  initial?: HypothesisFormInitial;
  onSubmit: (data: HypothesisFormPayload) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string | null;
}) {
  const [id, setId] = useState(initial?.id ?? "");
  const [hypothesis, setHypothesis] = useState(initial?.hypothesis ?? "");
  const [section, setSection] = useState(initial?.section ?? "");
  const [icp, setIcp] = useState(initial?.icp ?? "");
  const [status, setStatus] = useState(initial?.status ?? "running");
  const [posthog, setPosthog] = useState(initial?.evidencePosthog ?? "");
  const [variants, setVariants] = useState<{ key: string; value: string }[]>(() =>
    initial?.variants && Object.keys(initial.variants).length
      ? Object.entries(initial.variants).map(([key, value]) => ({ key, value }))
      : [
          { key: "control", value: "" },
          { key: "variant_b", value: "" },
        ],
  );

  function setVariant(i: number, patch: Partial<{ key: string; value: string }>) {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function addVariant() {
    setVariants((vs) => {
      const i = vs.length;
      // a–z for the first 26, then variant_26, variant_27… — always a valid \w+ key
      const key = i < 26 ? `variant_${String.fromCharCode(97 + i)}` : `variant_${i}`;
      return [...vs, { key, value: "" }];
    });
  }
  function removeVariant(i: number) {
    setVariants((vs) => vs.filter((_, idx) => idx !== i));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const variantRecord: Record<string, string> = {};
    for (const v of variants) {
      const k = v.key.trim();
      if (k) variantRecord[k] = v.value;
    }
    onSubmit({
      id: id.trim() || undefined,
      section: section.trim(),
      hypothesis: hypothesis.trim(),
      icp: icp.trim(),
      status,
      variants: variantRecord,
      evidencePosthog: posthog.trim(),
    });
  }

  const canSubmit = hypothesis.trim().length > 0 && !saving;

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border/60 bg-card p-5 mb-8 space-y-5"
    >
      <div>
        <label className={labelCls}>Hypothesis</label>
        <textarea
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          rows={2}
          placeholder="A coral primary CTA converts better than the neutral one."
          className={inputCls}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {mode === "create" ? (
          <div>
            <label className={labelCls}>id (optional)</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="auto from text"
              className={inputCls}
            />
          </div>
        ) : (
          <div>
            <label className={labelCls}>id</label>
            <input value={initial?.id ?? ""} disabled className={`${inputCls} opacity-50`} />
          </div>
        )}
        <div>
          <label className={labelCls}>section</label>
          <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="hero" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>icp</label>
          <input value={icp} onChange={(e) => setIcp(e.target.value)} placeholder="pre-pmf-founder" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>PostHog event</label>
          <input value={posthog} onChange={(e) => setPosthog(e.target.value)} placeholder="cta_click" className={inputCls} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls + " mb-0"}>Variants</label>
          <button
            type="button"
            onClick={addVariant}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border/50 rounded px-2 py-0.5 transition-colors"
          >
            + add variant
          </button>
        </div>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                value={v.key}
                onChange={(e) => setVariant(i, { key: e.target.value })}
                placeholder="control"
                className={`${inputCls} w-28 shrink-0 font-mono`}
              />
              <textarea
                value={v.value}
                onChange={(e) => setVariant(i, { value: e.target.value })}
                rows={1}
                placeholder="variant copy…"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => removeVariant(i)}
                className="shrink-0 w-8 h-9 rounded border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors text-[13px]"
                aria-label="remove variant"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-[12px] font-mono text-rose-500">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="text-[12px] font-medium px-3.5 py-2 rounded-lg bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {saving ? "saving…" : mode === "create" ? "Create hypothesis" : "Save & re-run Hermes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] px-3.5 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
