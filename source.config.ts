import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { z } from "zod";

// Marketing docs source — points at the existing content/docs/*.mdx tree.
// The journey-section nav (Get started / Configure / Run / Extend) is driven by
// content/docs/meta.json, not the folder layout, so existing URLs are preserved.
export const docs = defineDocs({
  dir: "content/docs",
});

// Shared permissive schema for the contract substrate + loop record collections.
// These files are heterogeneous (nulls/numbers/nested objects) and have no `title`
// frontmatter, so keep every field as-is (catchall) and only derive a `title`.
const recordSchema = z
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
  });

// Design-system substrate styleguide over the contract/* records (tokens / components).
export const system = defineDocs({
  dir: "contract",
  docs: { schema: recordSchema },
});

// The loop (v6 core): the experiments/* records + goals/, rendered at /experiments.
export const experiments = defineDocs({
  dir: "experiments",
  docs: { schema: recordSchema },
});

export default defineConfig();
