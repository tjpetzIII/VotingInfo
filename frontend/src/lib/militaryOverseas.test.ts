import { describe, expect, it } from "vitest";
import { militaryOverseasResources } from "./militaryOverseas";
describe("military overseas resources", () => { it("covers all states with FVAP and state links", () => { expect(militaryOverseasResources).toHaveLength(50); expect(militaryOverseasResources.every((r) => r.fpcaUrl.includes("fvap.gov") && r.fwabUrl.includes("fvap.gov") && r.stateOfficeUrl.startsWith("https://"))).toBe(true); }); });
