import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoIntel",
  description: "See the MOT history and likely fault patterns for any UK car — before you hand over your money.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <header className="border-b border-gray-800 px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight hover:text-yellow-400 transition-colors">AutoIntel</Link>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
