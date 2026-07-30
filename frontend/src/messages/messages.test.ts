import { describe, it, expect } from "vitest";
import en from "./en";
import es from "./es";

describe("i18n message catalogs", () => {
  it("es has exactly the same keys as en", () => {
    const enKeys = Object.keys(en).sort();
    const esKeys = Object.keys(es).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it("has no empty string values in either catalog", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en["${key}"] should not be empty`).not.toBe("");
    }
    for (const [key, value] of Object.entries(es)) {
      expect(value, `es["${key}"] should not be empty`).not.toBe("");
    }
  });

  it("preserves ICU placeholder names between en and es for each key", () => {
    const placeholderPattern = /\{(\w+)/g;
    const placeholdersOf = (s: string) => [...s.matchAll(placeholderPattern)].map((m) => m[1]).sort();

    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholdersOf(es[key])).toEqual(placeholdersOf(en[key]));
    }
  });
});
