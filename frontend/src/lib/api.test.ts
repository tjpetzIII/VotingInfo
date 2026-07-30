import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchVoterInfo, fetchAllElections, findContestById, type BallotContest } from "./api";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
      ...response,
    } as Response)
  );
}

describe("lib/api.ts error handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws a friendly not-found message on a 404", async () => {
    mockFetchOnce({ status: 404, ok: false });

    await expect(fetchVoterInfo("123 Main St, Austin, TX 78701")).rejects.toThrow(
      "No voter info found for this address."
    );
  });

  it("throws the server-provided error message for other non-2xx responses", async () => {
    mockFetchOnce({
      status: 502,
      ok: false,
      json: async () => ({ error: "Upstream Civic API unavailable" }),
    });

    await expect(fetchVoterInfo("123 Main St, Austin, TX 78701")).rejects.toThrow(
      "Upstream Civic API unavailable"
    );
  });

  it("falls back to a generic message when the error body has no `error` field", async () => {
    mockFetchOnce({
      status: 503,
      ok: false,
      json: async () => ({}),
    });

    await expect(fetchAllElections()).rejects.toThrow("Error 503");
  });

  it("propagates network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchAllElections()).rejects.toThrow("Failed to fetch");
  });

  it("returns parsed JSON on success", async () => {
    const payload = { elections: [{ id: "1", name: "General", election_day: "2026-11-03", ocd_division_id: null }] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => payload,
      } as Response)
    );

    await expect(fetchAllElections()).resolves.toEqual(payload);
  });
});

describe("findContestById", () => {
  const contests: BallotContest[] = [
    { id: 0, office: "President", district: null, level: "federal", candidates: [] },
    { id: 1, office: "Governor", district: null, level: "state", candidates: [] },
  ];

  it("finds the matching contest by id", () => {
    expect(findContestById(contests, "1")).toEqual(contests[1]);
  });

  it("returns undefined for a non-existent id", () => {
    expect(findContestById(contests, "99")).toBeUndefined();
  });

  it("returns undefined for a non-numeric contestId string", () => {
    expect(findContestById(contests, "abc")).toBeUndefined();
  });

  it("returns undefined for an empty contests array", () => {
    expect(findContestById([], "0")).toBeUndefined();
  });
});
