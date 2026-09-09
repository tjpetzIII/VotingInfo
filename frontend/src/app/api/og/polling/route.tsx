import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "Polling location";
  const address = url.searchParams.get("includeAddress") === "1" ? (url.searchParams.get("address") ?? "") : "";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "70px", background: "#eff6ff", color: "#111827", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 42, fontWeight: 700 }}>VoteReady</div>
      <div style={{ fontSize: 38, color: "#1d4ed8", marginTop: 48 }}>{name}</div>
      {address && <div style={{ fontSize: 28, color: "#374151", marginTop: 24 }}>{address}</div>}
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
