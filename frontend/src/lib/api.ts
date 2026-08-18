const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/**
 * Shared fetch + error-handling for every backend call in this module.
 *
 * Fetches `${API_BASE}${path}`, then:
 * - throws `options.notFoundMessage` (when provided) on a 404,
 * - throws the backend's `error` field — falling back to `Error ${status}` —
 *   on any other non-2xx response,
 * - otherwise returns the parsed JSON body typed as `T`.
 *
 * Network failures from `fetch` itself propagate unchanged.
 */
async function apiFetch<T>(
  path: string,
  options?: { notFoundMessage?: string }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (options?.notFoundMessage && res.status === 404) {
    throw new Error(options.notFoundMessage);
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json();
}

export interface Election {
  id: string;
  name: string;
  election_day: string;
}

export interface PollingLocation {
  name: string | null;
  address: string | null;
  hours: string | null;
  location_name: string | null;
}

export interface Candidate {
  name: string;
  party: string | null;
}

export interface Contest {
  office: string | null;
  district: string | null;
  candidates: Candidate[];
}

export interface VoterInfoResponse {
  election: Election;
  polling_locations: PollingLocation[];
  contests: Contest[];
}

export async function fetchVoterInfo(address: string): Promise<VoterInfoResponse> {
  return apiFetch<VoterInfoResponse>(
    `/api/voter-info?address=${encodeURIComponent(address)}`,
    { notFoundMessage: "No voter info found for this address." }
  );
}

export interface Channel {
  channel_type: string;
  id: string;
}

// --- Campaign finance (OpenFEC), VOT-60 ---
// Only present for federal (President/Senate/House) candidates with a confident FEC match;
// absent entirely otherwise — see specs/006-fec-campaign-finance/contracts/candidate-finance-field.md.

export interface Contributor {
  name: string;
  total: number;
}

export interface CampaignFinanceSummary {
  total_raised: number;
  total_spent: number;
  cash_on_hand: number;
  /** ISO 8601 date string (YYYY-MM-DD) — the FEC filing's coverage end date. */
  as_of_date: string;
  top_contributors?: Contributor[];
}

export interface CandidateDetail {
  name: string;
  party: string | null;
  candidate_url: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  channels: Channel[];
  campaign_finance?: CampaignFinanceSummary;
}

export interface ContestDetail {
  id: number;
  office: string | null;
  district: string | null;
  candidates: CandidateDetail[];
}

export interface ElectionsResponse {
  election: { id: string; name: string; election_day: string };
  contests: ContestDetail[];
}

export interface ElectionItem {
  id: string;
  name: string;
  election_day: string;
  ocd_division_id: string | null;
}

export interface AllElectionsResponse {
  elections: ElectionItem[];
}

export async function fetchAllElections(): Promise<AllElectionsResponse> {
  return apiFetch<AllElectionsResponse>(`/api/all-elections`);
}

export async function fetchElections(address: string): Promise<ElectionsResponse> {
  return apiFetch<ElectionsResponse>(
    `/api/elections?address=${encodeURIComponent(address)}`,
    { notFoundMessage: "No election data found for this address." }
  );
}

export interface ElectionOfficial {
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
}

export interface RegistrationAddress {
  location_name: string | null;
  line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface RegistrationResponse {
  available: boolean;
  same_day_registration?: boolean;
  online_registration?: boolean;
  admin_name?: string;
  registration_url?: string;
  registration_confirmation_url?: string;
  registration_deadline?: string;
  election_info_url?: string;
  absentee_voting_info_url?: string;
  voting_location_finder_url?: string;
  ballot_info_url?: string;
  election_rules_url?: string;
  voter_services?: string[];
  hours_of_operation?: string;
  correspondence_address?: RegistrationAddress;
  physical_address?: RegistrationAddress;
  election_officials?: ElectionOfficial[];
}

export async function fetchRegistration(address: string): Promise<RegistrationResponse> {
  return apiFetch<RegistrationResponse>(
    `/api/registration?address=${encodeURIComponent(address)}`,
    { notFoundMessage: "No registration info found for this address." }
  );
}

// --- Sample ballot ---

// Backend serializes BallotLevel with #[serde(rename_all = "lowercase")].
export type BallotLevel = "federal" | "state" | "local";

export interface BallotCandidate {
  name: string;
  party: string | null;
  candidate_url: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  channels: Channel[];
  campaign_finance?: CampaignFinanceSummary;
}

export interface BallotContest {
  id: number;
  office: string | null;
  district: string | null;
  level: BallotLevel;
  candidates: BallotCandidate[];
}

export interface BallotResponse {
  election: Election;
  contests: BallotContest[];
}

export function findContestById(
  contests: BallotContest[],
  contestId: string
): BallotContest | undefined {
  const parsedId = parseInt(contestId, 10);
  if (Number.isNaN(parsedId)) return undefined;
  return contests.find((c) => c.id === parsedId);
}

export async function fetchBallot(address: string): Promise<BallotResponse> {
  const data = await apiFetch<BallotResponse>(
    `/api/ballot?address=${encodeURIComponent(address)}`,
    { notFoundMessage: "No sample ballot found for this address." }
  );
  // Backend omits `channels` entirely when empty (skip_serializing_if); normalize so
  // CandidateCard's `candidate.channels.length` never sees undefined.
  return {
    ...data,
    contests: data.contests.map((contest) => ({
      ...contest,
      candidates: contest.candidates.map((candidate) => ({
        ...candidate,
        channels: candidate.channels ?? [],
      })),
    })),
  };
}

// --- State election dates (PA/AL/AK/...) ---
//
// Shared by every per-state scraper page; `state_code` is the discriminator
// instead of a dedicated type/fetcher per state. Mirrors the backend's
// StateElection/StateImportantDate/StateDataResponse (models/mod.rs).

export interface StateElection {
  id?: string;
  election_name: string;
  election_type: string;
  election_date: string;
  polls_hours?: string | null;
  registration_deadline?: string | null;
  mail_in_deadline?: string | null;
  state_code: string;
}

export interface StateImportantDate {
  id?: string;
  event_date: string;
  event_description: string;
  election_year: number;
  state_code: string;
}

export interface StateDataResponse {
  elections: StateElection[];
  important_dates: StateImportantDate[];
}

export async function fetchStateElections(stateCode: string): Promise<StateDataResponse> {
  return apiFetch<StateDataResponse>(`/api/${stateCode.toLowerCase()}-elections`);
}

// --- Election dates aggregation ---

export interface ElectionDate {
  label: string;
  category: string;
  /** ISO 8601 date string (YYYY-MM-DD). */
  date: string;
  /** Negative when the date is in the past. */
  days_remaining: number;
}

export interface ElectionDatesResponse {
  dates: ElectionDate[];
}

export async function fetchElectionDates(address: string): Promise<ElectionDatesResponse> {
  return apiFetch<ElectionDatesResponse>(
    `/api/elections/dates?address=${encodeURIComponent(address)}`
  );
}
