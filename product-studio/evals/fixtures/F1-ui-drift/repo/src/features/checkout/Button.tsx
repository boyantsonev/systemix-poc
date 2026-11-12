import React from "react";

// a second Button, written for checkout before components/ui existed
export function Button({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button className="bg-[#7c3aed] text-white text-[13px] rounded px-3 py-2" style={{ color: "#ffffff" }} onClick={onClick}>
      {label}
    </button>
  );
}
