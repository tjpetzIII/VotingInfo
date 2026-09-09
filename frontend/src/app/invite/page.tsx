"use client";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useAddress } from "@/contexts/AddressContext";
import { inviteFriend } from "@/lib/invite";

export default function InvitePage() {
  const intl = useIntl(); const { address } = useAddress(); const [includeAddress, setIncludeAddress] = useState(false); const [result, setResult] = useState<string | null>(null);
  async function share() { setResult(await inviteFriend(window.location.href, includeAddress, address)); }
  return <main className="max-w-xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold"><FormattedMessage id="invite.title" defaultMessage="Invite a friend to VoteReady" /></h1><p className="mt-3 text-gray-600"><FormattedMessage id="invite.subtitle" defaultMessage="Share a private link to help someone find voter information." /></p><label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={includeAddress} onChange={(e) => setIncludeAddress(e.target.checked)} />{intl.formatMessage({ id: "invite.includeAddress", defaultMessage: "Include my address context" })}</label><button className="mt-5 min-h-11 rounded-lg bg-blue-600 px-5 text-white" onClick={share}><FormattedMessage id="invite.share" defaultMessage="Invite a friend" /></button>{result && <p role="status" className="mt-4 text-sm"><FormattedMessage id="invite.result" defaultMessage="Your invite is ready." /></p>}</main>;
}
