import { loader } from "fumadocs-core/source";
import { system } from "../../.source/server";

// Fumadocs loader for the in-app System layer (the living styleguide), backed by
// the contract/* records. Nav groups by folder (tokens / components / hypotheses).
export const systemSource = loader({
  baseUrl: "/system",
  source: system.toFumadocsSource(),
});
