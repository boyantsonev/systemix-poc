"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HypothesisEditForm,
  type HypothesisFormInitial,
  type HypothesisFormPayload,
} from "./HypothesisEditForm";

// Edit toggle for the hypothesis detail page. On save: PATCH the contract,
// then trigger a fresh Hermes synthesis, then refresh the server-rendered page.
export function HypothesisEditPanel({
  slug,
  initial,
}: {
  slug: string;
  initial: HypothesisFormInitial;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(data: HypothesisFormPayload) {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/hypotheses/${slug}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? "save failed");

      // Saving forces Hermes to re-think.
      setThinking(true);
      await fetch("/api/hermes/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      }).catch(() => {});

      setThinking(false);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
      setThinking(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border/50 px-2.5 py-1 rounded hover:border-border transition-colors"
      >
        Edit hypothesis
      </button>
    );
  }

  return (
    <div className="w-full basis-full mt-3">
      <HypothesisEditForm
        mode="edit"
        initial={initial}
        onSubmit={submit}
        onCancel={() => setEditing(false)}
        saving={saving || thinking}
        error={error}
      />
      {thinking && (
        <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 -mt-6 mb-8">
          Hermes is re-thinking…
        </p>
      )}
    </div>
  );
}
