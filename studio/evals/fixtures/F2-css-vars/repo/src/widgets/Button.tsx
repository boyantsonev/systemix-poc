import React from "react";
import "../../styles/widgets.css";

export interface ButtonProps {
  /** primary for the one main action of a view */
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ variant = "secondary", size = "md", disabled = false, onClick, children }: ButtonProps) {
  return (
    <button className={`button button--${variant} button--${size}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
