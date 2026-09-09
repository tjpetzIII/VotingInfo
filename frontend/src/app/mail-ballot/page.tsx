"use client";
import { useState } from "react";
import { useIntl } from "react-intl";
import { MAIL_BALLOT_RESOURCES, getMailBallotResource } from "@/lib/mailBallotResources";

export default function MailBallotPage() {
  const intl = useIntl();
  const [state, setState] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const resource = getMailBallotResource(state);
  const toggle = (key: string) => setChecked((previous) => ({ ...previous, [key]: !previous[key] }));
  const link = (url: string, label: string) => <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{label} ↗</a>;
  return <div className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="text-3xl font-bold mb-2">{intl.formatMessage({ id: "mailBallot.title" })}</h1>
    <p className="text-gray-600 mb-8">{intl.formatMessage({ id: "mailBallot.subtitle" })}</p>
    <a href="/military-overseas" className="text-blue-600 underline">{intl.formatMessage({ id: "military.title", defaultMessage: "Military and overseas voting" })}</a>
    <label htmlFor="mail-state" className="block font-medium mb-2">{intl.formatMessage({ id: "mailBallot.state" })}</label>
    <select id="mail-state" value={state} onChange={(event) => setState(event.target.value)} className="w-full rounded-xl border p-3 mb-8">
      <option value="">{intl.formatMessage({ id: "mailBallot.chooseState" })}</option>{MAIL_BALLOT_RESOURCES.map((item) => <option key={item.state} value={item.state}>{item.name}</option>)}
    </select>
    <div className="space-y-5">
      {["registration", "request", "return", "track", "problem"].map((step) => <section key={step} className="bg-white rounded-2xl shadow-md p-5"><label className="flex gap-3 items-start"><input type="checkbox" checked={!!checked[step]} onChange={() => toggle(step)} className="mt-1" /><span><strong>{intl.formatMessage({ id: `mailBallot.${step}` })}</strong><br /><span className="text-sm text-gray-600">{intl.formatMessage({ id: `mailBallot.${step}Help` })}</span></span></label>{resource && <p className="mt-2">{link(step === "track" ? resource.trackingUrl : step === "problem" ? resource.problemUrl : resource.requestUrl, intl.formatMessage({ id: `mailBallot.${step}Link` }))}</p>}</section>)}
    </div>
    <p className="text-sm text-gray-500 mt-8">{intl.formatMessage({ id: "mailBallot.disclaimer" })}</p>
  </div>;
}
