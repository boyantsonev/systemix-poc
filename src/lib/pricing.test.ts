import { describe, expect, it } from "vitest";
import { DEFAULT_QUICK_REPORT_PRICE, quickReportCheckoutUrl, quickReportPrice } from "./pricing";

describe("pricing settings", () => {
  it("uses the default price until one is set", () => {
    expect(quickReportPrice({})).toBe(DEFAULT_QUICK_REPORT_PRICE);
    expect(quickReportPrice({ NEXT_PUBLIC_QUICK_REPORT_PRICE: " €4.99 " })).toBe("€4.99");
  });

  it("has no checkout link until an https one is set", () => {
    expect(quickReportCheckoutUrl({})).toBeNull();
    expect(quickReportCheckoutUrl({ NEXT_PUBLIC_QUICK_REPORT_CHECKOUT_URL: "http://shop.example/buy" })).toBeNull();
    expect(quickReportCheckoutUrl({ NEXT_PUBLIC_QUICK_REPORT_CHECKOUT_URL: "not a url" })).toBeNull();
    expect(quickReportCheckoutUrl({ NEXT_PUBLIC_QUICK_REPORT_CHECKOUT_URL: "https://shop.example/buy/1" })).toBe("https://shop.example/buy/1");
  });
});
