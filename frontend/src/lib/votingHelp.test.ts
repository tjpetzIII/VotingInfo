import { describe, expect, it } from "vitest";
import { reviewedVotingResources } from "./votingHelp";

describe("reviewed voting resources", () => {
  it("covers every state and DC with explicit review metadata", () => {
    expect(reviewedVotingResources).toHaveLength(51);
    expect(reviewedVotingResources.map((r) => r.jurisdiction)).toContain("DC");
    expect(reviewedVotingResources.every((r) => r.status === "reviewed" || r.status === "fallback" || r.status === "unknown")).toBe(true);
  });

  it("keeps PA identification guidance source scoped", () => {
    expect(reviewedVotingResources.find((r) => r.jurisdiction === "PA")?.identificationSummary).toMatch(/official election office/i);
  });
});
