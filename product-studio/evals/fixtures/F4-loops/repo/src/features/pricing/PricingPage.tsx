import React from "react";
import { PricingCard } from "./PricingCard";

const PLANS = [
  { plan: "Free", price: "$0", period: "per month", features: ["3 notebooks", "2 people"] },
  { plan: "Team", price: "$8", period: "per person, per month, billed yearly", features: ["Unlimited notebooks", "30 days of history"] },
];

export function PricingPage({ onChoose }: { onChoose: (plan: string) => void }) {
  return (
    <main className="pricing">
      <h1>Pricing</h1>
      <p>Every plan renews on the date you started. You can cancel from Settings at any time.</p>
      <div className="pricing__grid">
        {PLANS.map((p) => (
          <PricingCard key={p.plan} {...p} onChoose={() => onChoose(p.plan)} />
        ))}
      </div>
    </main>
  );
}
