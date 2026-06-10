import { contractSource } from "@/lib/contract-source";
import { createFromSource } from "fumadocs-core/search/server";

// Search endpoint scoped to the Contract layer (contract/* records). Kept
// separate from /api/search (docs) so searching inside /contract returns
// hypotheses / tokens / components, not marketing docs.
export const { GET } = createFromSource(contractSource);
