import { buildShareUrl, copyShareUrl } from "./share";

export async function inviteFriend(current: string, includeAddress: boolean, address: string): Promise<"shared" | "copied" | "failed"> {
  const url = buildShareUrl(current, includeAddress, address);
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try { await navigator.share({ title: "VoteReady", text: "Find your voter information", url }); return "shared"; } catch { /* user cancelled; clipboard remains available */ }
  }
  return (await copyShareUrl(url)) ? "copied" : "failed";
}
