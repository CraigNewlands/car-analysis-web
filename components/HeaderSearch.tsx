"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function HeaderSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const [vrm, setVrm] = useState("");

  // Only show on check pages
  if (!pathname.startsWith("/check/")) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = vrm.trim().toUpperCase().replace(/\s/g, "");
    if (clean) {
      setVrm("");
      router.push(`/check/${clean}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={vrm}
        onChange={(e) => setVrm(e.target.value)}
        placeholder="Enter plate"
        className="w-36 rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm font-mono uppercase tracking-wider placeholder:text-gray-600 focus:border-yellow-400 focus:outline-none"
        maxLength={8}
      />
      <button
        type="submit"
        disabled={!vrm.trim()}
        className="rounded-md bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-gray-950 hover:bg-yellow-300 disabled:opacity-40"
      >
        Check
      </button>
    </form>
  );
}
