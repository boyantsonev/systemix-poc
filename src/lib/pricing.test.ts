import { describe, expect, it } from "vitest";
import { SPONSOR_URL, setupPrice } from "./pricing";

describe("the offer (DSC-23)", () => {
  it("says the setup is priced per product until a starting price is set", () => {
    expect(setupPrice({})).toBe("Priced per product");
    expect(setupPrice({ NEXT_PUBLIC_SETUP_FROM: "  " })).toBe("Priced per product");
    expect(setupPrice({ NEXT_PUBLIC_SETUP_FROM: " €N " })).toBe("from €N");
  });

  it("links the sponsor page over https", () => {
    expect(new URL(SPONSOR_URL).protocol).toBe("https:");
  });
});
