"use client";

import { useState } from "react";
import { useIntl } from "react-intl";
import {
  useAddress,
  formatAddress,
  parseFormattedAddress,
} from "@/contexts/AddressContext";
import AddressForm from "./AddressForm";

/**
 * Shared "Using: {address} · Change" control shown on every address-driven page (FR-003). Reads the
 * single saved address from context and, on "Change", re-opens `AddressForm` pre-filled with the
 * saved values (FR-008), writing any valid new address back to the shared context.
 */
export default function AddressSummary() {
  const intl = useIntl();
  const { address, setAddress } = useAddress();
  const [editing, setEditing] = useState(false);

  // Nothing to summarize until an address has been saved.
  if (!address) return null;

  function handleSubmit(submitted: string) {
    const parsed = parseFormattedAddress(submitted);
    if (!parsed) return;
    setAddress(parsed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6 max-w-md">
        <AddressForm
          onSubmit={handleSubmit}
          loading={false}
          submitLabel={intl.formatMessage({ id: "addressSummary.save" })}
          initialValues={address}
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-3 min-h-11 w-full text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          {intl.formatMessage({ id: "addressSummary.cancel" })}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-gray-600">
      <span>
        {intl.formatMessage(
          { id: "addressSummary.using" },
          { address: formatAddress(address) }
        )}
      </span>
      <span aria-hidden className="text-gray-300">
        ·
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-h-11 -my-2 inline-flex items-center font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        {intl.formatMessage({ id: "addressSummary.change" })}
      </button>
    </div>
  );
}
