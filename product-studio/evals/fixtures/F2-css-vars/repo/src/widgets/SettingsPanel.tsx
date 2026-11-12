import React, { useState } from "react";
import { Button } from "./Button";
import { TextField } from "./TextField";

export function SettingsPanel({ onSave, onDelete }: { onSave: (name: string) => void; onDelete: () => void }) {
  const [name, setName] = useState("");
  return (
    <section className="settings-panel">
      <h2 className="settings-panel__title">Team settings</h2>
      <TextField id="team-name" label="Team name" hint="Shown on every shared notebook." value={name} onChange={setName} />
      <Button variant="primary" onClick={() => onSave(name)}>
        Save changes
      </Button>
      <p className="settings-panel__danger">Deleting the team removes every notebook.</p>
      <Button onClick={onDelete}>Delete team</Button>
    </section>
  );
}
