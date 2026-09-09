export type MailResourceStatus = "tracker" | "local_locator" | "unknown";
export interface MailBallotResource {
  state: string;
  name: string;
  requestUrl: string;
  trackingUrl: string;
  problemUrl: string;
  status: MailResourceStatus;
  jurisdiction: "statewide" | "local" | "unknown";
  source: string;
  reviewedAt: string;
}

const STATES: Record<string, string> = {
  AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California", CO:"Colorado", CT:"Connecticut", DE:"Delaware", FL:"Florida", GA:"Georgia", HI:"Hawaii", ID:"Idaho", IL:"Illinois", IN:"Indiana", IA:"Iowa", KS:"Kansas", KY:"Kentucky", LA:"Louisiana", ME:"Maine", MD:"Maryland", MA:"Massachusetts", MI:"Michigan", MN:"Minnesota", MS:"Mississippi", MO:"Missouri", MT:"Montana", NE:"Nebraska", NV:"Nevada", NH:"New Hampshire", NJ:"New Jersey", NM:"New Mexico", NY:"New York", NC:"North Carolina", ND:"North Dakota", OH:"Ohio", OK:"Oklahoma", OR:"Oregon", PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina", SD:"South Dakota", TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont", VA:"Virginia", WA:"Washington", WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming", DC:"District of Columbia"
};

const locator = (state: string): MailBallotResource => ({ state, name: STATES[state], requestUrl: `https://www.vote.gov/register/${state.toLowerCase()}/`, trackingUrl: `https://www.vote.gov/track/${state.toLowerCase()}/`, problemUrl: `https://www.vote.gov/${state.toLowerCase()}/`, status: "local_locator", jurisdiction: "local", source: "Vote.gov official state locator", reviewedAt: "2026-09-09" });
export const MAIL_BALLOT_RESOURCES: MailBallotResource[] = Object.keys(STATES).map(locator);
export function getMailBallotResource(state: string) { return MAIL_BALLOT_RESOURCES.find((resource) => resource.state === state) ?? null; }
