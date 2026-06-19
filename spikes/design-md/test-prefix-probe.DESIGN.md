---
version: alpha
name: Prefix Probe
colors:
  primary: "#3B82F6"
typography:
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
rounded:
  md: "8px"
spacing:
  md: "16px"
components:
  button:
    backgroundColor: "{colors.primary}"
systemix-evidence: { test: true }
weird_key: "no prefix at all"
123-numeric-start: { ok: false }
---

## Overview

Probe: do non-x- prefixed unknown root keys also pass lint cleanly?
