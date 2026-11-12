import React from "react";
import { Button } from "../../components/ui/Button";
import "./pricing-card.css";

export interface PricingCardProps {
  plan: string;
  price: string;
  period: string;
  features: string[];
  featured?: boolean;
  onChoose: () => void;
}

export function PricingCard({ plan, price, period, features, featured = false, onChoose }: PricingCardProps) {
  return (
    <article className={featured ? "pricing-card pricing-card--featured" : "pricing-card"}>
      {featured && <span className="pricing-card__badge">Most teams pick this</span>}
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
