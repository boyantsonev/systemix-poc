import type { Persona, Workflow, WorkflowCatalog } from "../ports/atlas";
import generated from "../../../.systemix/atlas.catalog.json";

// Thin adapter over the generated Atlas catalog (Phase-2). The workflow data now
// lives in contract/workflows/*.mdx and is compiled by `npx systemix atlas build`
// into .systemix/atlas.catalog.json — committed so /atlas renders on Vercel
// without running the CLI. This module simply implements the WorkflowCatalog port
// over that artifact; the `atlasCatalog` export signature is unchanged, so both
// consumers (AtlasCanvas, the prototype page) keep importing it untouched.
//
// To change a workflow: edit its contract/workflows/*.mdx, run `npm run atlas`
// (or `node packages/cli/bin/cli.js atlas build`), and commit the regenerated JSON.

const WORKFLOWS: readonly Workflow[] = (generated.workflows as Workflow[]);

export const atlasCatalog: WorkflowCatalog = {
  all: () => WORKFLOWS,
  byPersona: (persona: Persona) => WORKFLOWS.filter((w) => w.persona === persona),
  byId: (id: string) => WORKFLOWS.find((w) => w.id === id),
};
