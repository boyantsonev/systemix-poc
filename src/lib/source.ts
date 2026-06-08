import { loader } from "fumadocs-core/source";
import { docs } from "../../.source/server";

// Fumadocs loader over the existing content/docs tree. The journey-section nav
// (Get started / Configure / Run / Extend) is defined in content/docs/meta.json.
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});
