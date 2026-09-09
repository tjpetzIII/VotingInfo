export function buildShareUrl(current: string, includeAddress: boolean, address: string): string {
  const url = new URL(current);
  url.searchParams.delete("address");
  if (includeAddress && address) url.searchParams.set("address", address);
  return url.toString();
}

export async function copyShareUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
