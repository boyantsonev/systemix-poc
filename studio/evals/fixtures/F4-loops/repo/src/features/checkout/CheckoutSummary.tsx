import React from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export interface CheckoutSummaryProps {
  plan: string;
  total: string;
  renews: string;
  onPay: () => void;
}

export function CheckoutSummary({ plan, total, renews, onPay }: CheckoutSummaryProps) {
  return (
    <Card title="Your order">
      <p>{plan} plan</p>
      <p>Total today: {total}</p>
      <p>Renews on {renews}. We email you a week before.</p>
      <Button variant="primary" type="submit" onClick={onPay}>
        Pay and start the plan
      </Button>
    </Card>
  );
}
