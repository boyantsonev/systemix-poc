import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

// Fumadocs search endpoint — Orama index built from the docs source.
// The DocsLayout search dialog (RootProvider) queries this by default.
export const { GET } = createFromSource(source);
