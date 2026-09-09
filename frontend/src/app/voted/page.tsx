"use client";
import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";

function paintBadge(canvas: HTMLCanvasElement, election: string, name: string, title: string) {
  canvas.width = 900; canvas.height = 600; const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.fillStyle = "#1d4ed8"; ctx.fillRect(0, 0, 900, 600); ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(450, 290, 190, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#172554"; ctx.textAlign = "center"; ctx.font = "bold 64px sans-serif"; ctx.fillText(title, 450, 275); ctx.font = "bold 28px sans-serif"; ctx.fillText(election || "Election", 450, 330); if (name) { ctx.font = "24px sans-serif"; ctx.fillText(name, 450, 375); }
}

export default function VotedPage() {
  const intl = useIntl(); const canvasRef = useRef<HTMLCanvasElement>(null); const [election, setElection] = useState(""); const [name, setName] = useState("");
  const title = intl.formatMessage({ id: "voted.badge" });
  useEffect(() => { if (canvasRef.current) paintBadge(canvasRef.current, election.trim(), name.trim(), title); }, [election, name, title]);
  function download() { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement("a"); link.download = "i-voted-badge.png"; link.href = canvas.toDataURL("image/png"); link.click(); }
  const appUrl = typeof window === "undefined" ? "https://voteready.example" : window.location.origin;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(intl.formatMessage({ id: "voted.shareText" }, { election: election.trim() || intl.formatMessage({ id: "voted.electionFallback" }), url: appUrl }))}`;
  return <div className="max-w-3xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-2">{intl.formatMessage({ id: "voted.title" })}</h1><p className="text-gray-600 mb-8">{intl.formatMessage({ id: "voted.subtitle" })}</p><div className="space-y-4 mb-8"><label className="block font-medium" htmlFor="voted-election">{intl.formatMessage({ id: "voted.election" })}<input id="voted-election" value={election} onChange={(e) => setElection(e.target.value)} className="block w-full rounded-lg border p-3 mt-1" /></label><label className="block font-medium" htmlFor="voted-name">{intl.formatMessage({ id: "voted.name" })}<span className="font-normal text-gray-500"> {intl.formatMessage({ id: "voted.optional" })}</span><input id="voted-name" value={name} onChange={(e) => setName(e.target.value)} className="block w-full rounded-lg border p-3 mt-1" /></label></div><canvas ref={canvasRef} className="w-full rounded-2xl shadow" role="img" aria-label={intl.formatMessage({ id: "voted.preview" })} /><div className="flex flex-wrap gap-3 mt-5"><button type="button" onClick={download} className="rounded-lg bg-blue-600 text-white px-4 py-3">{intl.formatMessage({ id: "voted.download" })}</button><a href={shareUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-blue-600 text-blue-700 px-4 py-3">{intl.formatMessage({ id: "voted.share" })}</a></div><p className="text-sm text-gray-500 mt-5">{intl.formatMessage({ id: "voted.privacy" })}</p></div>;
}
