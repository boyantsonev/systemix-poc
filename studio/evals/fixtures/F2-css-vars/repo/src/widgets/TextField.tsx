import React from "react";

export interface TextFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextField({ id, label, hint, value, onChange }: TextFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}
