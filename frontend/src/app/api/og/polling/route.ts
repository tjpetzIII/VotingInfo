import { NextResponse } from "next/server";

export const runtime = "edge";

export function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "Polling location";
  const address = url.searchParams.get("includeAddress") === "1" ? (url.searchParams.get("address") ?? "") : "";
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#eff6ff"/><text x="70" y="180" font-family="sans-serif" font-size="42" font-weight="700" fill="#111827">VoteReady</text><text x="70" y="280" font-family="sans-serif" font-size="38" fill="#1d4ed8">${escape(name)}</text>${address ? `<text x="70" y="350" font-family="sans-serif" font-size="28" fill="#374151">${escape(address)}</text>` : ""}</svg>`;
  return new NextResponse(body, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" } });
}
