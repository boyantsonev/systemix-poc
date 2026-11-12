import React, { useState } from "react";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";

export function SettingsScreen({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <main className="settings">
      <h1>Settings</h1>
      <TextField id="team-name" label="Team name" value={name} onChange={setName} />
      <Button variant="primary" onClick={() => onSave(name)}>
        Save changes
      </Button>
    </main>
  );
}
