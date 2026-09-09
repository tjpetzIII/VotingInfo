import type { Metadata } from "next";
import PollingClient from "./PollingClient";

export const metadata: Metadata = {
  title: "Find Your Polling Place | VoteReady",
  description: "Find official polling location information for your address.",
  openGraph: {
    title: "Find Your Polling Place | VoteReady",
    description: "Official polling location information.",
    images: [{ url: "/api/og/polling", width: 1200, height: 630, alt: "VoteReady polling location" }],
  },
};

export default function PollingPage() {
  return <PollingClient />;
}
