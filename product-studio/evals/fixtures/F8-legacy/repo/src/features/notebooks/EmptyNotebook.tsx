import React from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function EmptyNotebook({ onWrite }: { onWrite: () => void }) {
  return (
    <Card>
      <p>Nothing here yet. Write the first note.</p>
      <Button variant="primary" onClick={onWrite}>
        Write a note
      </Button>
    </Card>
  );
}
