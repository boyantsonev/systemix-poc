import { loader } from "fumadocs-core/source";
import { experiments } from "../../.source/server";

// Fumadocs loader for the loop (v6 core) — the experiments/* records + goals/,
// rendered at /experiments. Mirrors contractSource (the design-system substrate).
export const experimentsSource = loader({
  baseUrl: "/experiments",
  source: experiments.toFumadocsSource(),
});
