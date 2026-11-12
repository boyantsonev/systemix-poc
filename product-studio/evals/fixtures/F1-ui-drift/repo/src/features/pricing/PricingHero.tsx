import React from "react";
import Image from "next/image";
import { Button } from "../../../components/ui/Button";

export function PricingHero() {
  return (
    <section className="bg-[#f5f5f4] py-16 text-center">
      <Image src="/hero.png" width={960} height={480} />
      <h1 className="text-[40px] text-ink">Notes your team will actually read</h1>
      <p className="text-[15px] text-hint">Start free. Upgrade when you need history.</p>
      <Button>Start free today!</Button>
    </section>
  );
}
