import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "VoteReady",
  description: "Find your polling place and voter information",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
        <Providers>
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href="/" className="text-2xl font-bold text-blue-600">VoteReady</Link>
                <span className="text-sm text-gray-500 mt-1 hidden sm:inline">
                  — Your voter information guide
                </span>
              </div>
              <nav className="flex items-center gap-4 text-sm font-medium">
                <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
                  All Elections
                </Link>
                <Link href="/voter-info" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Voter Info
                </Link>
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} VoteReady. Empowering voters
              everywhere.
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
