import { systemSource } from "@/lib/system-source";
import { createFromSource } from "fumadocs-core/search/server";

// Search endpoint scoped to the System layer (contract/* records). Kept separate
// from /api/search (docs) so searching inside /system returns tokens / components
// / hypotheses, not marketing docs.
export const { GET } = createFromSource(systemSource);
