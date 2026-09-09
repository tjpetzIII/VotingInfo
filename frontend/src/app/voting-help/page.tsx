"use client";

import Link from "next/link";
import { FormattedMessage, useIntl } from "react-intl";
import { reviewedVotingResources } from "@/lib/votingHelp";

export default function VotingHelpPage() {
  const intl = useIntl();
  return <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
    <div><h1 className="text-3xl font-bold"><FormattedMessage id="votingHelp.title" defaultMessage="Voting help" /></h1>
      <p className="mt-2 text-gray-600"><FormattedMessage id="votingHelp.subtitle" defaultMessage="Official resources for registration, accessibility, language help, and voters who moved." /></p></div>
    <section aria-labelledby="help-topics" className="grid gap-4 sm:grid-cols-2">
      <h2 id="help-topics" className="sr-only">{intl.formatMessage({ id: "votingHelp.topics", defaultMessage: "Help topics" })}</h2>
      {[["votingHelp.registration","Registration"],["votingHelp.accessibility","Accessibility"],["votingHelp.language","Language assistance"],["votingHelp.moved","Moved voters"]].map(([id, fallback]) => <article key={id} className="rounded-xl border p-5"><h3 className="font-semibold">{intl.formatMessage({ id, defaultMessage: fallback })}</h3><p className="mt-2 text-sm text-gray-600">{intl.formatMessage({ id: `${id}.body`, defaultMessage: "Check your official election office for current instructions and eligibility." })}</p></article>)}
    </section>
    <section aria-labelledby="official-resources"><h2 id="official-resources" className="text-xl font-semibold"><FormattedMessage id="votingHelp.resources" defaultMessage="Official state resources" /></h2><ul className="mt-3 grid gap-2 sm:grid-cols-3">{reviewedVotingResources.map((resource) => <li key={resource.jurisdiction}><a className="underline" href={resource.officialUrl} target="_blank" rel="noopener noreferrer">{resource.jurisdiction}</a><span className="ml-2 text-xs text-gray-500">{resource.status}</span>{resource.identificationSummary && <p className="text-xs text-gray-600">{resource.identificationSummary}</p>}</li>)}</ul></section>
    <Link className="underline" href="/voter-info"><FormattedMessage id="votingHelp.back" defaultMessage="Back to voter information" /></Link>
  </main>;
}
