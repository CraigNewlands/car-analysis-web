"use client";

import { useState } from "react";
import { submitPrice } from "@/lib/api";
import type { VehicleReport } from "@/lib/types";

export default function PriceInput({ report }: { report: VehicleReport }) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (!price || price <= 0) return;

    await submitPrice({
      registration: report.registration,
      asking_price: price,
      make: report.make,
      model: report.model,
      year: parseInt(report.year),
      mileage: report.mileage,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <p className="text-sm text-gray-400">
          <span className="text-green-400 font-medium">Thanks.</span> We&apos;ve recorded the asking price — this helps build valuation data for future buyers.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <h2 className="mb-1 text-base font-semibold">What&apos;s the asking price?</h2>
      <p className="mb-4 text-sm text-gray-400">Optional — helps us build valuation data for this model.</p>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 7500"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 pl-7 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!value}
          className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
