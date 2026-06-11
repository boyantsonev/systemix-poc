import { loader } from "fumadocs-core/source";
import { system } from "../../.source/server";

// Fumadocs loader for the Contract layer — the living agreement rendered from
// the contract/* records (hypotheses / tokens / components). The underlying MDX
// collection keeps its `system` export name for now: renaming it churns the
// fumadocs codegen with no route-level gain, so it rides with the Phase B
// hierarchy work (docs/feature/contract-rework/ia-and-migration.md).
export const contractSource = loader({
  baseUrl: "/contract",
  source: system.toFumadocsSource(),
});
