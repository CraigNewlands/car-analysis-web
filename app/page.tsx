"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [vrm, setVrm] = useState("");
  const [price, setPrice] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = vrm.trim().toUpperCase().replace(/\s/g, "");
    if (!clean) return;
    const priceVal = price.replace(/[^0-9]/g, "");
    const url = priceVal ? `/check/${clean}?price=${priceVal}` : `/check/${clean}`;
    router.push(url);
  }

  return (
    <div className="flex flex-col items-center gap-10 py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Know what you're buying</h1>
        <p className="mt-3 text-gray-400">
          See the MOT history and likely fault patterns for any UK car — before you hand over your money.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          value={vrm}
          onChange={(e) => setVrm(e.target.value)}
          placeholder="e.g. AB12 CDE"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-center text-lg font-mono uppercase tracking-widest text-white placeholder:text-gray-600 focus:border-yellow-400 focus:outline-none"
          maxLength={8}
          autoFocus
        />
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">£</span>
          <input
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Asking price (optional)"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 pl-8 pr-4 py-3 text-lg text-white placeholder:text-gray-600 focus:border-yellow-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-gray-950 hover:bg-yellow-300 disabled:opacity-40"
          disabled={!vrm.trim()}
        >
          Check
        </button>
      </form>
    </div>
  );
}
