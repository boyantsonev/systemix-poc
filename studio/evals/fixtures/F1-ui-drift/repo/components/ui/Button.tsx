import React from "react";

export interface ButtonProps {
  variant?: "primary" | "secondary";
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ variant = "primary", onClick, children }: ButtonProps) {
  const cls = variant === "primary" ? "bg-brand text-white" : "bg-surface text-ink";
  return (
    <button className={`${cls} rounded-md px-4 py-2`} onClick={onClick}>
      {children}
    </button>
  );
}
