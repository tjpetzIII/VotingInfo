"use client";

import Link from "next/link";
import { useIntl, FormattedMessage } from "react-intl";

const helpfulLinks = [
  { href: "/", labelId: "notFound.linkAllElections" },
  { href: "/voter-info", labelId: "notFound.linkVoterInfo" },
  { href: "/registration-dates", labelId: "notFound.linkRegistrationDates" },
  { href: "/dates", labelId: "notFound.linkKeyDates" },
] as const;

export default function NotFound() {
  const intl = useIntl();
  return (
    <div className="flex items-center justify-center min-h-full py-16 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          <FormattedMessage id="notFound.title" />
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          <FormattedMessage id="notFound.description" />
        </p>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors inline-block"
        >
          {intl.formatMessage({ id: "notFound.goHome" })}
        </Link>
        <div className="mt-8 border-t border-gray-100 pt-6">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">
            <FormattedMessage id="notFound.helpfulLinks" />
          </p>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {helpfulLinks.map(({ href, labelId }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  {intl.formatMessage({ id: labelId })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
