import React from "react";
import "./button.css";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "destructive";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ variant = "secondary", type = "button", disabled = false, onClick, children }: ButtonProps) {
  return (
    <button className={`button button--${variant}`} type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
