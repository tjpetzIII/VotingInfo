"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useIntl } from "react-intl";
import LocaleSwitcher from "./LocaleSwitcher";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const intl = useIntl();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkClass = (href: string) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname?.startsWith(href);
    return `transition-colors border-b-2 pb-0.5 ${
      isActive
        ? "text-blue-600 border-blue-600"
        : "text-gray-600 border-transparent hover:text-blue-600"
    }`;
  };

  const mobileNavLinkClass = (href: string) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname?.startsWith(href);
    return `block px-4 py-3 text-sm font-medium border-l-2 transition-colors ${
      isActive
        ? "text-blue-600 border-blue-600 bg-blue-50"
        : "text-gray-700 border-transparent hover:text-blue-600 hover:bg-gray-50"
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

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
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

        {/* Mobile hamburger button */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white py-2">
          <Link href="/" className={mobileNavLinkClass("/")} onClick={() => setMenuOpen(false)}>
            {intl.formatMessage({ id: "nav.allElections" })}
          </Link>
          <Link href="/voter-info" className={mobileNavLinkClass("/voter-info")} onClick={() => setMenuOpen(false)}>
            {intl.formatMessage({ id: "nav.voterInfo" })}
          </Link>
          <Link href="/registration-dates" className={mobileNavLinkClass("/registration-dates")} onClick={() => setMenuOpen(false)}>
            Registration Dates
          </Link>
          <div className="px-4 py-3 border-l-2 border-transparent">
            <LocaleSwitcher />
          </div>
          {!loading && (
            user ? (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-gray-500 text-xs truncate max-w-[180px]">{user.email}</span>
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-gray-100">
                <Link
                  href="/login"
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </Link>
              </div>
            )
          )}
        </div>
      )}
    </header>
  );
}
