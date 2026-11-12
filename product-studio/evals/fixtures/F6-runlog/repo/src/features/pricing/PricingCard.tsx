import React from "react";
import { Button } from "../../components/ui/Button";
import "./pricing-card.css";

export interface PricingCardProps {
  plan: string;
  price: string;
  period: string;
  features: string[];
  onChoose: () => void;
}

export function PricingCard({ plan, price, period, features, onChoose }: PricingCardProps) {
  return (
    <article className="pricing-card">
      <h3 className="pricing-card__plan">{plan}</h3>
      <p className="pricing-card__price">
        {price} <span className="pricing-card__period">{period}</span>
      </p>
      <ul className="pricing-card__features">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <Button variant="primary" onClick={onChoose}>
        Choose this plan
      </Button>
    </article>
  );
}
