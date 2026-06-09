"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HypothesisEditForm, type HypothesisFormPayload } from "./HypothesisEditForm";

// "New hypothesis" button for the list page; opens an inline create form,
// POSTs to /api/hypotheses, then navigates to the new contract.
export function HypothesisCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(data: HypothesisFormPayload) {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/hypotheses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? "create failed");
      setOpen(false);
      router.refresh();
      router.push(`/design-system/hypotheses/${j.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
      >
        + New hypothesis
      </button>
    );
  }

  return (
    <HypothesisEditForm
      mode="create"
      onSubmit={submit}
      onCancel={() => setOpen(false)}
      saving={saving}
      error={error}
    />
  );
}
