"use client";

export function WorkflowBeam() {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card px-6 py-8">
      <svg
        viewBox="0 0 640 200"
        className="w-full max-w-[600px] mx-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          {/* Design → Code beam gradient (violet → transparent) */}
          <linearGradient id="beam-dtc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
            <stop offset="40%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>

          {/* Code → Design beam gradient (teal → transparent) */}
          <linearGradient id="beam-ctd" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
            <stop offset="40%" stopColor="#14b8a6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>

          {/* Glow filters */}
          <filter id="glow-violet" x="-50%" y="-300%" width="200%" height="700%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-teal" x="-50%" y="-300%" width="200%" height="700%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── Track lines (static, faint) ───────────────────────────────── */}
        {/* Top track: Figma → Codebase */}
        <line x1="148" y1="72" x2="492" y2="72" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        {/* Bottom track: Codebase → Figma */}
        <line x1="492" y1="128" x2="148" y2="128" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        {/* Connector right (Codebase node join) */}
        <path d="M 492 72 Q 520 72 520 90 Q 520 108 492 128" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        {/* Connector left (Figma node join) */}
        <path d="M 148 128 Q 120 128 120 110 Q 120 92 148 72" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />

        {/* ── Animated beam: design → code (top, left to right) ─────────── */}
        <line x1="148" y1="72" x2="492" y2="72"
          stroke="url(#beam-dtc)"
          strokeWidth="2"
          strokeDasharray="80 260"
          strokeDashoffset="340"
          filter="url(#glow-violet)"
        >
          <animate attributeName="stroke-dashoffset" from="340" to="-80" dur="2.4s" repeatCount="indefinite" />
        </line>

        {/* ── Animated beam: code → design (bottom, right to left) ──────── */}
        <line x1="492" y1="128" x2="148" y2="128"
          stroke="url(#beam-ctd)"
          strokeWidth="2"
          strokeDasharray="80 260"
          strokeDashoffset="340"
          filter="url(#glow-teal)"
        >
          <animate attributeName="stroke-dashoffset" from="340" to="-80" dur="2.8s" repeatCount="indefinite" begin="1.2s" />
        </line>

        {/* ── Arrow heads ───────────────────────────────────────────────── */}
        {/* Top arrow (→ Codebase) */}
        <polyline points="484,67 492,72 484,77" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Bottom arrow (→ Figma) */}
        <polyline points="156,123 148,128 156,133" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* ── Beam labels ───────────────────────────────────────────────── */}
        <text x="320" y="60" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.4" letterSpacing="0.08em" fontFamily="var(--font-mono, monospace)">
          DESIGN → CODE
        </text>
        <text x="320" y="148" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.4" letterSpacing="0.08em" fontFamily="var(--font-mono, monospace)">
          CODE → DESIGN
        </text>

        {/* ── Node: Figma ───────────────────────────────────────────────── */}
        <rect x="52" y="78" width="96" height="24" rx="6" fill="none" stroke="#a855f7" strokeOpacity="0.4" strokeWidth="1" />
        <rect x="52" y="78" width="96" height="24" rx="6" fill="#a855f7" fillOpacity="0.06" />
        {/* Figma logo-ish dot */}
        <circle cx="70" cy="90" r="3.5" fill="#a855f7" fillOpacity="0.7" />
        <text x="80" y="94" fontSize="10" fill="currentColor" fillOpacity="0.85" fontWeight="600" fontFamily="var(--font-sans, sans-serif)">Figma</text>

        {/* ── Node: Claude Code (center, slightly elevated) ─────────────── */}
        <rect x="264" y="76" width="112" height="28" rx="7" fill="none" stroke="#14b8a6" strokeOpacity="0.5" strokeWidth="1.5" />
        <rect x="264" y="76" width="112" height="28" rx="7" fill="#14b8a6" fillOpacity="0.07" />
        {/* Dot */}
        <circle cx="282" cy="90" r="3.5" fill="#14b8a6" fillOpacity="0.8" />
        <text x="292" y="94" fontSize="10" fill="currentColor" fillOpacity="0.85" fontWeight="600" fontFamily="var(--font-sans, sans-serif)">Claude Code</text>

        {/* ── Node: Codebase ────────────────────────────────────────────── */}
        <rect x="492" y="78" width="96" height="24" rx="6" fill="none" stroke="#3b82f6" strokeOpacity="0.4" strokeWidth="1" />
        <rect x="492" y="78" width="96" height="24" rx="6" fill="#3b82f6" fillOpacity="0.06" />
        {/* Code brackets icon */}
        <text x="503" y="94" fontSize="9" fill="#3b82f6" fillOpacity="0.7" fontFamily="var(--font-mono, monospace)">&lt;/&gt;</text>
        <text x="522" y="94" fontSize="10" fill="currentColor" fillOpacity="0.85" fontWeight="600" fontFamily="var(--font-sans, sans-serif)">Codebase</text>

        {/* ── Center glow pulse ─────────────────────────────────────────── */}
        <circle cx="320" cy="100" r="2.5" fill="#14b8a6" fillOpacity="0.6">
          <animate attributeName="r" values="2.5;5;2.5" dur="3s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.6;0.1;0.6" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
