"use strict";

/**
 * npx systemix config show
 * Pretty-print the active instance topology from systemix.config.yaml.
 */

const { loadConfig, CONFIG_FILE } = require("../config");

function row(label, value) {
  console.log(`    ${String(label).padEnd(18)} ${value}`);
}

function configShow() {
  let cfg;
  try {
    cfg = loadConfig();
  } catch (err) {
    console.error(`\n  ✗ ${err.message}\n`);
    process.exit(1);
  }

  console.log(`\n  ${CONFIG_FILE} — instance topology\n`);

  console.log("  Surfaces");
  console.log(`    ${(cfg.surfaces || []).join(", ") || "(none)"}\n`);

  console.log("  Signals");
  for (const [name, s] of Object.entries(cfg.signals || {})) {
    const extra = s && s.poll_interval_sec ? `  (poll ${s.poll_interval_sec}s)` : "";
    row(name, `${s && s.enabled ? "on" : "off"}${extra}`);
  }
  console.log();

  console.log("  Hermes");
  if (cfg.hermes) {
    row("model", cfg.hermes.model);
    row("endpoint", cfg.hermes.endpoint);
    row("autonomy", cfg.hermes.autonomy);
    if (cfg.hermes.thresholds) {
      row("thresholds", `high ${cfg.hermes.thresholds.high} · medium ${cfg.hermes.thresholds.medium}`);
    }
  }
  console.log();

  console.log("  Self-improvement");
  if (cfg.self_improvement) {
    row("mode", cfg.self_improvement.mode);
    if (cfg.self_improvement.meta_contract) row("meta-contract", cfg.self_improvement.meta_contract);
  }
  console.log();

  console.log("  Trust");
  if (cfg.trust) {
    row("orchestrator", `tier ${cfg.trust.orchestrator_tier}`);
    row("hermes", `tier ${cfg.trust.hermes_tier}`);
  }
  console.log();
}

async function config(args) {
  const sub = args[0] || "show";
  if (sub === "show") {
    configShow();
    return;
  }
  console.error(`\n  Unknown config subcommand: ${sub}\n`);
  console.log("  Usage: npx systemix config show\n");
  console.log("  To change config: edit systemix.config.yaml, or run `npx systemix init --reconfigure`.\n");
  process.exit(1);
}

module.exports = { config, configShow };
