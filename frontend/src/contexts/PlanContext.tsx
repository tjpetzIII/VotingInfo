"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const PLAN_VERSION = 1;
const KEY = "voting-plan";
export interface VotingPlan { version: number; method: "in_person" | "mail" | "early" | ""; date: string; site: string; checklist: Record<string, boolean>; stale: boolean; }
const empty: VotingPlan = { version: PLAN_VERSION, method: "", date: "", site: "", checklist: {}, stale: false };
interface PlanValue { plan: VotingPlan; update: (patch: Partial<VotingPlan>, persist?: boolean) => void; reset: () => void; markStale: () => void; }
const Context = createContext<PlanValue>({ plan: empty, update: () => {}, reset: () => {}, markStale: () => {} });
export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<VotingPlan>(empty);
  useEffect(() => { try { const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); if (parsed.version === PLAN_VERSION) setPlan({ ...empty, ...parsed }); } } catch {} }, []);
  const update = (patch: Partial<VotingPlan>, persist = false) => { setPlan((current) => { const next = { ...current, ...patch, version: PLAN_VERSION }; try { sessionStorage.setItem(KEY, JSON.stringify(next)); if (persist) localStorage.setItem(KEY, JSON.stringify(next)); } catch {} return next; }); };
  const reset = () => { setPlan(empty); try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch {} };
  return <Context.Provider value={{ plan, update, reset, markStale: () => update({ stale: true }) }}>{children}</Context.Provider>;
}
export function usePlan() { return useContext(Context); }
