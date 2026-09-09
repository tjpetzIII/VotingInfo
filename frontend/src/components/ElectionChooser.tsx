"use client";
import { useIntl } from "react-intl";
import { useElection } from "@/contexts/ElectionContext";
export default function ElectionChooser() {
  const intl = useIntl(); const { choices, electionId, setElectionId, selectionRequired, isLoading, error } = useElection();
  if (isLoading) return <p role="status">{intl.formatMessage({ id: "electionChooser.loading" })}</p>;
  if (error) return <p role="alert">{intl.formatMessage({ id: "electionChooser.error" })}</p>;
  if (choices.length === 0) return <p role="status">{intl.formatMessage({ id: "electionChooser.empty" })}</p>;
  if (choices.length === 1 && !selectionRequired) return null;
  return <fieldset className="my-4"><legend className="font-semibold">{intl.formatMessage({ id: "electionChooser.label" })}</legend>{choices.map(e => <label key={e.id} className="block cursor-pointer py-2"><input type="radio" name="election" value={e.id} checked={e.id === electionId} onChange={() => setElectionId(e.id)} className="mr-2" />{e.name} ({e.election_day})</label>)}</fieldset>;
}
