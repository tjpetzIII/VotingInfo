export type ReviewStatus = "reviewed" | "fallback" | "unknown";

export interface ReviewedVotingResource {
  jurisdiction: string;
  officialUrl: string;
  status: ReviewStatus;
  reviewedOn: string | null;
  identificationSummary?: string;
}

const jurisdictions = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"] as const;

export const reviewedVotingResources: ReviewedVotingResource[] = jurisdictions.map((jurisdiction) => ({
  jurisdiction,
  officialUrl: `https://www.usa.gov/state-election-office/${jurisdiction.toLowerCase()}`,
  status: "fallback",
  reviewedOn: null,
  ...(jurisdiction === "PA" ? { identificationSummary: "Pennsylvania accepts approved photo or qualifying non-photo identification; confirm current requirements with the official election office." } : {}),
  ...(jurisdiction === "AL" ? { identificationSummary: "Alabama identification rules vary by voting situation; confirm current accepted documents with the official election office." } : {}),
  ...(jurisdiction === "AK" ? { identificationSummary: "Alaska identification rules depend on the voting method; confirm current accepted documents with the official election office." } : {}),
}));
