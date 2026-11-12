import React from "react";
import { Button as UIButton } from "../../../components/ui/Button";
import { Button } from "./Button";

export default function CheckoutPage({ onPay, onUpgrade }: { onPay: () => void; onUpgrade: () => void }) {
  return (
    <main className="max-w-xl mx-auto p-6">
      <img src="/cards.png" className="h-8" />
      <h1 className="text-[28px] font-bold text-ink">Checkout</h1>
      <p className="text-hint bg-surface">Billed yearly. Cancel any time.</p>
      <div id="add" className="flex gap-2">
        <UIButton variant="primary" onClick={onPay}>Pay now</UIButton>
        <Button label="Upgrade to Team" onClick={onUpgrade} />
      </div>
      <p className="text-sm text-[#a8a29e]">Buy now!!! Don't miss out! Guaranteed results for your team.</p>
    </main>
  );
}
