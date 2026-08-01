"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AddressForm from "@/components/AddressForm";
import AddressSummary from "@/components/AddressSummary";
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

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: VoterInfoResponse }
  | { status: "error"; message: string };

export default function PollingPage() {
  const { address: savedAddress, setAddress } = useAddress();
  const [pageState, setPageState] = useState<PageState>({ status: "idle" });

  const runFetch = useCallback(async (address: string) => {
    setPageState({ status: "loading" });
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

    try {
      const res = await fetch(
        `${apiBase}/api/voter-info?address=${encodeURIComponent(address)}`
      );

      if (res.status === 404) {
        setPageState({ status: "error", message: "No election data found for this address." });
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setPageState({
          status: "error",
          message: (json as { error?: string }).error ?? "Failed to fetch voter info.",
        });
        return;
      }

      setPageState({ status: "success", data: await res.json() });
    } catch {
      setPageState({ status: "error", message: "Could not reach the server. Please try again." });
    }
  }, []);

  // Auto-fetch whenever a saved address is present (on mount-time hydration or a change from
  // any page). The derived string is the effect key, so re-renders don't re-trigger fetches.
  const formatted = savedAddress ? formatAddress(savedAddress) : null;
  useEffect(() => {
    if (formatted) runFetch(formatted);
  }, [formatted, runFetch]);

  function handleAddressSubmit(address: string) {
    const parsed = parseFormattedAddress(address);
    if (parsed) {
      // Updates the shared context, which drives the auto-fetch effect above and propagates
      // the address to every other page.
      setAddress(parsed);
    } else {
      runFetch(address);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Polling Place</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Enter your full address to find your polling location.
      </p>

      <AddressSummary />

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <AddressForm
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
          </div>

          {pageState.data.polling_locations.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-sm">
              No polling locations found for this address.
            </div>
          ) : (
            <>
              <PollingMap locations={pageState.data.polling_locations} />
              <h2 className="sr-only">Polling Locations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageState.data.polling_locations.map((loc, i) => (
                  <PollingLocationCard key={i} location={loc} />
                ))}
              </div>
            </>
          )}
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
