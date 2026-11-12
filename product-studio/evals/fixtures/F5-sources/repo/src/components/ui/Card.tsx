import React from "react";
import "./card.css";

export interface CardProps {
  title: string;
  children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      <h2 className="card__title">{title}</h2>
      {children}
    </section>
  );
}
