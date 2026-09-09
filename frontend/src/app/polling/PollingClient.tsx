"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import AddressForm from "@/components/AddressForm";
import AddressSummary from "@/components/AddressSummary";
import InviteFriend from "@/components/InviteFriend";
import ElectionChooser from "@/components/ElectionChooser";
import { useElection } from "@/contexts/ElectionContext";
import {
  useAddress,
  formatAddress,
  parseFormattedAddress,
} from "@/contexts/AddressContext";
import type { PollingLocation, VoterInfoResponse } from "@/lib/api";

const PollingMap = dynamic(() => import("@/components/PollingMap"), {
  ssr: false,
  loading: () => <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />,
});
import PollingLocationCard from "@/components/PollingLocationCard";
import DataSourceNote from "@/components/DataSourceNote";

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: VoterInfoResponse }
  | { status: "error"; message: string };

export default function PollingPage() {
  const { address: savedAddress, setAddress } = useAddress();
  const searchParams = useSearchParams();
  const urlAddress = searchParams?.get("address") ?? "";
  const { electionId } = useElection();
  const intl = useIntl();
  const [pageState, setPageState] = useState<PageState>({ status: "idle" });
  const requestRef = useRef(0);
  const [category, setCategory] = useState<"election_day" | "early_voting" | "ballot_drop_off">("election_day");

  const runFetch = useCallback(async (address: string) => {
    const requestId = ++requestRef.current;
    setPageState({ status: "loading" });
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

    try {
      const res = await fetch(
        `${apiBase}/api/voter-info?address=${encodeURIComponent(address)}${electionId ? `&electionId=${encodeURIComponent(electionId)}` : ""}`
      );

      if (res.status === 404) {
        if (requestId === requestRef.current) {
          setPageState({ status: "error", message: "No election data found for this address." });
        }
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (requestId === requestRef.current) {
          setPageState({
            status: "error",
            message: (json as { error?: string }).error ?? "Failed to fetch voter info.",
          });
        }
        return;
      }

      const data = await res.json();
      if (requestId === requestRef.current) setPageState({ status: "success", data });
    } catch {
      if (requestId === requestRef.current) {
        setPageState({ status: "error", message: "Could not reach the server. Please try again." });
      }
    }
  }, [electionId]);

  // Auto-fetch whenever a saved address is present (on mount-time hydration or a change from
  // any page). The derived string is the effect key, so re-renders don't re-trigger fetches.
  const formatted = savedAddress ? formatAddress(savedAddress) : null;
  useEffect(() => {
    if (urlAddress) {
      const parsed = parseFormattedAddress(urlAddress);
      if (parsed && formatted !== urlAddress) setAddress(parsed);
      runFetch(urlAddress);
    } else if (formatted) runFetch(formatted);
  }, [formatted, runFetch, setAddress, urlAddress]);

  function handleAddressSubmit(address: string) {
    const parsed = parseFormattedAddress(address);
    if (parsed) {
      // Updates the shared context, which drives the auto-fetch effect above and propagates
      // the address to every other page.
      setAddress(parsed);
    } else {
      runFetch(address);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("address", address);
    window.history.pushState({}, "", url.toString());
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Polling Place</h1>
      <Link className="text-sm underline" href="/voting-help">Voting help and official resources</Link>
      <p className="text-gray-500 mb-8 text-sm">
        Enter your full address to find your polling location.
      </p>

      <AddressSummary />
      <InviteFriend />
      <ElectionChooser />

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <AddressForm
          initialValues={parseFormattedAddress(urlAddress) ?? savedAddress}
          onSubmit={handleAddressSubmit}
          loading={pageState.status === "loading"}
          submitLabel="Find My Polling Place"
          loadingLabel="Searching..."
        />
      </div>

      {pageState.status === "loading" && <LoadingSkeleton />}

      {pageState.status === "error" && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {pageState.message}
        </div>
      )}

      {pageState.status === "success" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Election
            </p>
            <p className="font-semibold text-gray-900">{pageState.data.election.name}</p>
            <p className="text-sm text-gray-500">{pageState.data.election.election_day}</p>
            <DataSourceNote metadata={pageState.data.metadata} />
          </div>

          {pageState.data.mail_only && <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-sm">{intl.formatMessage({ id: "polling.mailOnly" })}</div>}
          <div className="flex flex-wrap gap-2" role="group" aria-label={intl.formatMessage({ id: "polling.locationType" })}>
            {(["election_day", "early_voting", "ballot_drop_off"] as const).map((key) => (
              <button key={key} type="button" onClick={() => setCategory(key)} aria-pressed={category === key} className={`min-h-11 rounded-full px-4 text-sm font-medium border ${category === key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}>
                {key === "election_day" ? intl.formatMessage({ id: "polling.electionDay" }) : key === "early_voting" ? intl.formatMessage({ id: "polling.earlyVoting" }) : intl.formatMessage({ id: "polling.dropOff" })}
              </button>
            ))}
          </div>

          {(() => {
            const locations = category === "election_day" ? pageState.data.polling_locations : category === "early_voting" ? (pageState.data.early_vote_sites ?? []) : (pageState.data.drop_off_locations ?? []);
            const categoryLabel = category === "election_day" ? intl.formatMessage({ id: "polling.electionDay" }) : category === "early_voting" ? intl.formatMessage({ id: "polling.earlyVoting" }) : intl.formatMessage({ id: "polling.dropOff" });
            return locations.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-sm">
              {intl.formatMessage({ id: "polling.empty" }, { type: categoryLabel.toLowerCase() })}
              {pageState.data.voting_location_finder_url && <a className="block underline mt-2" href={pageState.data.voting_location_finder_url} target="_blank" rel="noopener noreferrer">{intl.formatMessage({ id: "polling.finder" })}</a>}
            </div>
          ) : (
            <>
              <PollingMap locations={locations} />
              <h2 className="sr-only">Voting Locations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {locations.map((loc, i) => (
                  <PollingLocationCard
                    key={i}
                    location={loc}
                    address={savedAddress ? formatAddress(savedAddress) : ""}
                  />
                ))}
              </div>
            </>
          ); })()}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-48" />
      <div className="h-80 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-gray-200 rounded-2xl h-36" />
        ))}
      </div>
    </div>
  );
}
