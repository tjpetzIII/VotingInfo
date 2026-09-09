"use client";
import { useState } from "react";
import { useIntl } from "react-intl";
import type { BallotContest } from "@/lib/api";
export default function BallotMeasureExplainer({ contest }: { contest: BallotContest }) {
  const intl = useIntl(); const [open, setOpen] = useState(false);
  if (!contest.measure_title && !contest.measure_text) return null;
  return <div className="mt-3 border border-blue-200 rounded-lg p-3 bg-blue-50"><button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="font-semibold text-left text-blue-900">{open ? intl.formatMessage({ id: "measure.hide" }) : intl.formatMessage({ id: "measure.explain" })}</button>{open && <div className="mt-3 text-sm text-gray-800 space-y-2"><p>{contest.measure_text || intl.formatMessage({ id: "measure.unavailable" })}</p>{contest.measure_url && <a className="underline text-blue-700" href={contest.measure_url} target="_blank" rel="noopener noreferrer">{intl.formatMessage({ id: "measure.official" })}</a>}<p className="text-xs text-gray-600">{intl.formatMessage({ id: "measure.neutral" })}</p></div>}</div>;
}
