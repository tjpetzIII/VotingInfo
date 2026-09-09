"use client";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { formatAddress, useAddress } from "@/contexts/AddressContext";
import { buildShareUrl, copyShareUrl } from "@/lib/share";
export default function InviteFriend() {
  const intl = useIntl(); const { address } = useAddress(); const [include, setInclude] = useState(false); const [copied, setCopied] = useState(false);
  const addressText = address ? formatAddress(address) : "";
  const url = typeof window === "undefined" ? "" : buildShareUrl(window.location.href, include, addressText); const msg = intl.formatMessage({ id: "invite.message", defaultMessage: "Find your voter information with VoteReady" });
  return <section className="mt-8 rounded-xl border bg-white p-5" aria-labelledby="invite-heading"><h2 id="invite-heading" className="font-semibold"><FormattedMessage id="invite.cta" defaultMessage="Invite a friend to vote" /></h2><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={include} onChange={(e) => setInclude(e.target.checked)} /><FormattedMessage id="invite.includeAddress" defaultMessage="Include my address context" /></label><div className="mt-4 flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm text-white" onClick={() => copyShareUrl(url).then(setCopied)}>{copied ? "Copied" : "Copy link"}</button><a className="min-h-11 rounded-lg border px-4 py-2 text-sm" href={`sms:?&body=${encodeURIComponent(`${msg}: ${url}`)}`}><FormattedMessage id="invite.sms" defaultMessage="Text" /></a><a className="min-h-11 rounded-lg border px-4 py-2 text-sm" href={`mailto:?subject=${encodeURIComponent(msg)}&body=${encodeURIComponent(`${msg}: ${url}`)}`}><FormattedMessage id="invite.email" defaultMessage="Email" /></a></div></section>;
}
