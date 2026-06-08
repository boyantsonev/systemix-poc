import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { z } from "zod";

// Marketing docs source — points at the existing content/docs/*.mdx tree.
// The journey-section nav (Get started / Configure / Run / Extend) is driven by
// content/docs/meta.json, not the folder layout, so existing URLs are preserved.
export const docs = defineDocs({
  dir: "content/docs",
});

// In-app System layer — the living styleguide over the contract/* records
// (tokens / components / hypotheses). These files have no `title` frontmatter,
// so derive one from the type-specific identity field. Only the fields the
// styleguide renders are kept (others are stripped).
export const system = defineDocs({
  dir: "contract",
  docs: {
    // Permissive: contract frontmatter is heterogeneous across record types and
    // includes nulls/numbers/nested objects. Keep every field as-is (catchall)
    // and only derive a `title` (these files have none). ContractMeta reads the
    // fields it needs defensively.
    schema: z
      .object({})
      .catchall(z.any())
      .transform((v) => {
        const d = v as Record<string, unknown>;
        return {
          ...d,
          title:
            (d.title as string | undefined) ??
            (d.token as string | undefined) ??
            (d.component as string | undefined) ??
            (d.hypothesis as string | undefined) ??
            (d.id as string | undefined) ??
            "Untitled",
        };
      }),
  },
});

export default defineConfig();
