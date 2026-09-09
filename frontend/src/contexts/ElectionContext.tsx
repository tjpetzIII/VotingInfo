"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { fetchElectionChoices, type Election } from "@/lib/api";
import { formatAddress, useAddress } from "./AddressContext";

interface ElectionContextValue {
  electionId: string | null;
  setElectionId: (id: string | null) => void;
  choices: Election[];
  selectionRequired: boolean;
  isLoading: boolean;
  error: Error | null;
}
const ElectionContext = createContext<ElectionContextValue>({ electionId: null, setElectionId: () => {}, choices: [], selectionRequired: false, isLoading: false, error: null });

function useOptionalSearchParams() {
  try {
    return useSearchParams();
  } catch {
    return null;
  }
}

export function ElectionProvider({ children }: { children: ReactNode }) {
  const { address } = useAddress();
  // Some legacy test consumers mock next/navigation without useSearchParams;
  // treat that environment like a route with no explicit election.
  const params = useOptionalSearchParams();
  const formatted = address ? formatAddress(address) : "";
  const [selection, setSelection] = useState<{ address: string; id: string | null }>({ address: "", id: null });
  const query = useQuery({ queryKey: ["election-choices", formatted], queryFn: () => fetchElectionChoices(formatted), enabled: !!formatted });
  const urlId = params?.get("electionId") ?? null;
  useEffect(() => {
    if (selection.address !== formatted) {
      const id = formatted ? (urlId || null) : null;
      setSelection({ address: formatted, id });
      if (formatted) sessionStorage.setItem("election-selection", JSON.stringify({ address: formatted, id }));
    }
  }, [formatted, urlId, selection.address]);
  useEffect(() => {
    if (typeof window === "undefined" || formatted) return;
    try { const stored = JSON.parse(sessionStorage.getItem("election-selection") || "null"); if (stored?.address) setSelection(stored); } catch { /* ignore corrupt state */ }
  }, [formatted]);
  const setElectionId = (id: string | null) => { setSelection({ address: formatted, id }); sessionStorage.setItem("election-selection", JSON.stringify({ address: formatted, id })); };
  return <ElectionContext.Provider value={{ electionId: selection.address === formatted ? selection.id : null, setElectionId, choices: query.data?.elections ?? [], selectionRequired: query.data?.selection_required ?? false, isLoading: query.isLoading, error: query.error as Error | null }}>{children}</ElectionContext.Provider>;
}
export const useElection = () => useContext(ElectionContext);
