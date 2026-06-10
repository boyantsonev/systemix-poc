import { describe, it, expect } from "vitest";
import { isValidSlug, slugify } from "@/lib/contract/hypothesis-mdx";

// isValidSlug is the path-traversal guard the three API routes rely on before
// ever touching the filesystem. It IS its own driving port (pure function whose
// signature is the public interface), so calling it directly is port-to-port.

describe("isValidSlug — path-traversal guard", () => {
  it.each([
    ["pricing-headline-v2", true],
    ["a", true],
    ["a0", true],
    ["x123-y456", true],
  ])("accepts well-formed slug %s", (slug, expected) => {
    expect(isValidSlug(slug)).toBe(expected);
  });

  it.each([
    ["", "empty"],
    ["../etc/passwd", "parent traversal"],
    ["foo/bar", "path separator"],
    ["Foo", "uppercase"],
    ["-leading-dash", "leading dash"],
    ["under_score", "underscore"],
    ["has space", "whitespace"],
    [".", "dot"],
    ["..", "double dot"],
  ])("rejects %s (%s)", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });
});

describe("slugify", () => {
  it.each([
    ["Pricing Headline V2", "pricing-headline-v2"],
    ["  Trim & Collapse  ", "trim-collapse"],
    ["already-slug", "already-slug"],
    ["UPPER_CASE!!!", "upper-case"],
  ])("slugifies %s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("produces a slug that passes isValidSlug for ordinary prose", () => {
    expect(isValidSlug(slugify("My New Hypothesis About Pricing"))).toBe(true);
  });
});
