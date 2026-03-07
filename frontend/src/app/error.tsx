"use client";

import { useIntl, FormattedMessage } from "react-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const intl = useIntl();
  return (
    <div className="flex items-center justify-center min-h-full py-16 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">
          <FormattedMessage id="error.title" />
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {error.message || intl.formatMessage({ id: "error.defaultMessage" })}
        </p>
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          <FormattedMessage id="error.tryAgain" />
        </button>
      </div>
    </div>
  );
}
