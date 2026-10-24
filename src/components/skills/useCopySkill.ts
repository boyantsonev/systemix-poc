"use client";

import { useCallback, useState } from "react";

export type CopySkillState = "idle" | "loading" | "copied" | "error";

// Shared fetch+clipboard logic for "copy skill" — fetches the full SKILL.md
// body via /api/skills/<slug> and copies it (a folder skill copies its install
// command instead, as a pasted SKILL.md would lose its sibling files). Used by the /skills/[slug]
// dossier page (its "Copy skill.md" CTA) and the /config graph's node
// inspector (NodeCardPanel), which previously duplicated this logic inline.
export function useCopySkill(slug: string) {
  const [state, setState] = useState<CopySkillState>("idle");

  const copy = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/skills/${slug}`);
      if (!res.ok) throw new Error("not found");
      const data = (await res.json()) as { body: string; copyText?: string };
      await navigator.clipboard.writeText(data.copyText ?? data.body);
      setState("copied");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }, [slug]);

  return { state, copy };
}
