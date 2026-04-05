"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIntl } from "react-intl";
import LocaleSwitcher from "./LocaleSwitcher";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const intl = useIntl();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  const navLinkClass = (href: string) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname?.startsWith(href);
    return `transition-colors border-b-2 pb-0.5 ${
      isActive
        ? "text-blue-600 border-blue-600"
        : "text-gray-600 border-transparent hover:text-blue-600"
    }`;
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-2xl font-bold text-blue-600">VoteReady</Link>
          <span className="text-sm text-gray-500 mt-1 hidden sm:inline">
            {intl.formatMessage({ id: "header.tagline" })}
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className={navLinkClass("/")}>
            {intl.formatMessage({ id: "nav.allElections" })}
          </Link>
          <Link href="/voter-info" className={navLinkClass("/voter-info")}>
            {intl.formatMessage({ id: "nav.voterInfo" })}
          </Link>
          <Link href="/registration-dates" className={navLinkClass("/registration-dates")}>
            Registration Dates
          </Link>
          <LocaleSwitcher />
          {!loading && (
            user ? (
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs hidden sm:inline truncate max-w-[140px]">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                Sign In
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
