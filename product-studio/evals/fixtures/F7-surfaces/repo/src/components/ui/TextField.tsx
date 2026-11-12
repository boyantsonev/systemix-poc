import React from "react";

export interface TextFieldProps {
  id: string;
  label: string;
  type?: "text" | "email";
  value: string;
  onChange: (value: string) => void;
}

export function TextField({ id, label, type = "text", value, onChange }: TextFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
