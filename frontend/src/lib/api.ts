const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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
  const res = await fetch(
    `${API_BASE}/api/voter-info?address=${encodeURIComponent(address)}`
  );
  if (res.status === 404) {
    throw new Error("No voter info found for this address.");
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json();
}

export interface Channel {
  channel_type: string;
  id: string;
}

export interface CandidateDetail {
  name: string;
  party: string | null;
  candidate_url: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  channels: Channel[];
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
  const res = await fetch(`${API_BASE}/api/all-elections`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json();
}

export async function fetchElections(address: string): Promise<ElectionsResponse> {
  const res = await fetch(
    `${API_BASE}/api/elections?address=${encodeURIComponent(address)}`
  );
  if (res.status === 404) {
    throw new Error("No election data found for this address.");
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json();
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
  const res = await fetch(
    `${API_BASE}/api/registration?address=${encodeURIComponent(address)}`
  );
  if (res.status === 404) {
    throw new Error("No registration info found for this address.");
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json();
}
