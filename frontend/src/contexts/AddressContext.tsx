"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

const STORAGE_KEY = "address";

export interface SavedAddress {
  street: string;
  city: string;
  state: string; // 2-letter, uppercased
  zip: string; // 5 digits
}

interface AddressContextValue {
  address: SavedAddress | null;
  setAddress: (address: SavedAddress) => void;
  clearAddress: () => void;
}

const AddressContext = createContext<AddressContextValue>({
  address: null,
  setAddress: () => {},
  clearAddress: () => {},
});

/** Derives the single API-ready string the backend expects, matching AddressForm's format. */
export function formatAddress(address: SavedAddress): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
}

/**
 * Parses a formatted address string (as produced by `formatAddress` / `AddressForm`) back into
 * structured fields. Parses from the right so a street containing commas (e.g. "123 Main St, Apt 4")
 * is preserved: the final comma-separated segment is always "ST zip" and the one before it is the
 * city. Returns null if the shape doesn't match (e.g. the free-text search box on the elections page).
 */
export function parseFormattedAddress(formatted: string): SavedAddress | null {
  const parts = formatted.split(",").map((p) => p.trim());
  if (parts.length < 3) return null;
  const last = parts[parts.length - 1]; // "ST zip"
  const city = parts[parts.length - 2];
  const street = parts.slice(0, parts.length - 2).join(", ");
  const match = last.match(/^([A-Za-z]{2})\s+(\d{5})$/);
  if (!match || !street || !city) return null;
  return { street, city, state: match[1].toUpperCase(), zip: match[2] };
}

function isSavedAddress(value: unknown): value is SavedAddress {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.street === "string" &&
    typeof v.city === "string" &&
    typeof v.state === "string" &&
    typeof v.zip === "string"
  );
}

export function AddressProvider({ children }: { children: ReactNode }) {
  const [address, setAddressState] = useState<SavedAddress | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (isSavedAddress(parsed)) {
        setAddressState({
          street: parsed.street,
          city: parsed.city,
          state: parsed.state,
          zip: parsed.zip,
        });
      }
    } catch {
      // Corrupt/unreadable storage → behave as "no saved address" (FR-009).
    }
  }, []);

  function setAddress(next: SavedAddress) {
    setAddressState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage disabled/full → keep the in-memory value for this session.
    }
  }

  function clearAddress() {
    setAddressState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage disabled → still clear the in-memory value.
    }
  }

  return (
    <AddressContext.Provider value={{ address, setAddress, clearAddress }}>
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  return useContext(AddressContext);
}
