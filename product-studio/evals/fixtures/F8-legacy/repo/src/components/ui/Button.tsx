import React from "react";

export interface ButtonProps {
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ variant = "secondary", disabled = false, onClick, children }: ButtonProps) {
  return (
    <button className={`button button--${variant}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
