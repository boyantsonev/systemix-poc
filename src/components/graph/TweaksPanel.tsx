"use client";

// TweaksPanel — ported from the forced-graph prototype (tweaks-panel.jsx).
// The prototype's host edit-mode protocol (postMessage to a parent frame) is
// removed; here the panel is a plain in-app floating control surface.

import { useRef, useState, type ReactNode } from "react";

const PANEL_STYLE = `
  .twk-panel{position:absolute;right:16px;bottom:16px;z-index:30;width:264px;
    max-height:calc(100% - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.82);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 var(--font-sans,ui-sans-serif),system-ui,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}
  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;background:rgba(0,0,0,.06)}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:pointer;padding:4px 6px;line-height:1.2}
  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:pointer;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}
  .twk-launch{position:absolute;right:16px;bottom:16px;z-index:30;appearance:none;
    padding:7px 13px;border-radius:9px;border:.5px solid rgba(255,255,255,.6);
    background:rgba(250,249,247,.82);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);
    box-shadow:0 6px 20px rgba(0,0,0,.12);color:#29261b;cursor:pointer;
    font:11px/1 'JetBrains Mono',var(--font-mono,monospace);letter-spacing:.02em}
  .twk-launch:hover{background:rgba(255,255,255,.95)}
`;

export interface Tweaks {
  bgTone: "warm" | "cool" | "white";
  edgeOpacity: number;
  nodeSizeScale: number;
  nodeResolution: number;
  showParticles: boolean;
  particleSpeed: number;
}

export const TWEAK_DEFAULTS: Tweaks = {
  bgTone: "warm",
  edgeOpacity: 0.37,
  nodeSizeScale: 1.9,
  nodeResolution: 22,
  showParticles: true,
  particleSpeed: 0.006,
};

export function TweaksPanel({
  open,
  onOpen,
  onClose,
  children,
  title = "Tweaks",
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  if (!open) {
    return (
      <>
        <style>{PANEL_STYLE}</style>
        <button className="twk-launch" onClick={onOpen}>⚙ tweaks</button>
      </>
    );
  }
  return (
    <>
      <style>{PANEL_STYLE}</style>
      <div className="twk-panel">
        <div className="twk-hd">
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks" onClick={onClose}>✕</button>
        </div>
        <div className="twk-body">{children}</div>
      </div>
    </>
  );
}

export function TweakSection({ label }: { label: string }) {
  return <div className="twk-sect">{label}</div>;
}

function TweakRow({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="twk-row">
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function TweakSlider({
  label, value, min = 0, max = 100, step = 1, unit = "", onChange,
}: {
  label: string; value: number; min?: number; max?: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
        value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

export function TweakToggle({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? "1" : "0"}
        role="switch" aria-checked={value} onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

export function TweakRadio<T extends string>({
  label, value, options, onChange,
}: {
  label: string; value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;
  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" className="twk-seg">
        <div className="twk-seg-thumb"
          style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`, width: `calc((100% - 4px) / ${n})` }} />
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
            onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </TweakRow>
  );
}

/** Hook holding the tweak values (plain useState — no host persistence). */
export function useTweaks(defaults: Tweaks = TWEAK_DEFAULTS) {
  const [values, setValues] = useState<Tweaks>(defaults);
  function setTweak<K extends keyof Tweaks>(key: K, val: Tweaks[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }
  return [values, setTweak] as const;
}
