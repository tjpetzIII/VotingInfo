"use client";

import { useState } from "react";
import { useIntl } from "react-intl";

interface AddressFormProps {
  onSubmit: (address: string) => void;
  loading: boolean;
  submitLabel: string;
  loadingLabel?: string;
}

export default function AddressForm({
  onSubmit,
  loading,
  submitLabel,
  loadingLabel,
}: AddressFormProps) {
  const intl = useIntl();
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const s = street.trim();
    const c = city.trim();
    const st = state.trim().toUpperCase();
    const z = zip.trim();

    if (!s || !c || !st || !z) {
      setError(intl.formatMessage({ id: "addressForm.fillAllFields" }));
      return;
    }
    if (st.length !== 2 || !/^[A-Z]+$/.test(st)) {
      setError(intl.formatMessage({ id: "addressForm.stateError" }));
      return;
    }
    if (!/^\d{5}$/.test(z)) {
      setError(intl.formatMessage({ id: "addressForm.zipError" }));
      return;
    }

    setError(null);
    onSubmit(`${s}, ${c}, ${st} ${z}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="af-street" className="block text-sm font-medium text-gray-700 mb-1">
          {intl.formatMessage({ id: "addressForm.streetLabel" })}
        </label>
        <input
          id="af-street"
          type="text"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder={intl.formatMessage({ id: "addressForm.streetPlaceholder" })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="af-city" className="block text-sm font-medium text-gray-700 mb-1">
          {intl.formatMessage({ id: "addressForm.cityLabel" })}
        </label>
        <input
          id="af-city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={intl.formatMessage({ id: "addressForm.cityPlaceholder" })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="af-state" className="block text-sm font-medium text-gray-700 mb-1">
            {intl.formatMessage({ id: "addressForm.stateLabel" })}
          </label>
          <input
            id="af-state"
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder={intl.formatMessage({ id: "addressForm.statePlaceholder" })}
            maxLength={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="af-zip" className="block text-sm font-medium text-gray-700 mb-1">
            {intl.formatMessage({ id: "addressForm.zipLabel" })}
          </label>
          <input
            id="af-zip"
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder={intl.formatMessage({ id: "addressForm.zipPlaceholder" })}
            maxLength={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {loading ? (loadingLabel ?? submitLabel) : submitLabel}
      </button>
    </div>
  );
}
