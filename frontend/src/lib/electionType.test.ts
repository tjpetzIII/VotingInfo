import { describe, it, expect } from "vitest";
import { classifyElectionType } from "./electionType";

describe("classifyElectionType", () => {
  it("classifies a general election", () => {
    expect(classifyElectionType("2026 General Election")).toBe("general");
  });

  it("classifies a primary election", () => {
    expect(classifyElectionType("2026 Primary Election")).toBe("primary");
  });

  it("classifies a special election", () => {
    expect(classifyElectionType("November 2026 Special Election")).toBe("special");
  });

  it("classifies a runoff election", () => {
    expect(classifyElectionType("2026 Runoff Election")).toBe("runoff");
  });

  it("prefers 'special' over 'primary' for a compound name", () => {
    expect(classifyElectionType("2026 Special Primary Election")).toBe("special");
  });

  it("prefers 'runoff' over 'special' for a compound name", () => {
    expect(classifyElectionType("2026 Special Runoff Election")).toBe("runoff");
  });

  it("falls back to generic for an unrecognized name", () => {
    expect(classifyElectionType("City Council Municipal Election")).toBe("generic");
  });

  it("falls back to generic for an empty name", () => {
    expect(classifyElectionType("")).toBe("generic");
  });

  it("is case-insensitive", () => {
    expect(classifyElectionType("2026 GENERAL ELECTION")).toBe("general");
  });
});
