"use client";

import { useIntl } from "react-intl";

export default function Footer() {
  const intl = useIntl();
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
        {intl.formatMessage(
          { id: "footer.copyright" },
          { year: new Date().getFullYear() }
        )}
      </div>
    </footer>
  );
}
