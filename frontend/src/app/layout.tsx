import type { Metadata } from "next";
import "./globals.css";

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
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">VoteReady</span>
            <span className="text-sm text-gray-500 mt-1">
              — Your voter information guide
            </span>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} VoteReady. Empowering voters
            everywhere.
          </div>
        </footer>
      </body>
    </html>
  );
}
