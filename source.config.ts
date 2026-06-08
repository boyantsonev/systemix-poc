import { defineDocs, defineConfig } from "fumadocs-mdx/config";

// Marketing docs source — points at the existing content/docs/*.mdx tree.
// The journey-section nav (Get started / Configure / Run / Extend) is driven by
// content/docs/meta.json, not the folder layout, so existing URLs are preserved.
export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig();
