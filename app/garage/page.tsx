"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSavedCars, removeCar, type SavedCar } from "@/lib/savedCars";

export default function GaragePage() {
  const [cars, setCars] = useState<SavedCar[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCars(getSavedCars());
    setMounted(true);
  }, []);

  function handleRemove(registration: string) {
    removeCar(registration);
    setCars(getSavedCars());
  }

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">My Garage</h1>
        <p className="text-sm text-gray-400 mt-1">Cars you&apos;ve saved for quick access</p>
      </div>

      {cars.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center text-gray-500">
          <p className="text-lg font-medium text-gray-400">No saved cars yet</p>
          <p className="text-sm mt-1">Search for a car and hit &quot;Save to garage&quot; to add it here</p>
          <Link href="/" className="mt-4 inline-block text-sm text-yellow-400 hover:text-yellow-300">
            Search a plate →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cars.map((car) => {
            const scoreColour =
              car.scoreColour === "red" ? "text-red-400" :
              car.scoreColour === "yellow" ? "text-yellow-400" :
              "text-green-400";
            const borderColour =
              car.scoreColour === "red" ? "border-red-900" :
              car.scoreColour === "yellow" ? "border-yellow-900" :
              "border-green-900";

            return (
              <div key={car.registration} className={`rounded-xl border ${borderColour} bg-gray-900 px-5 py-4 flex items-center gap-4`}>
                <Link href={`/check/${car.registration}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="rounded-md border-2 border-yellow-400 bg-yellow-400 px-2.5 py-1 font-mono text-sm font-black tracking-widest text-gray-950 shrink-0">
                    {car.registration}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{car.make} {car.model}</p>
                    <p className="text-xs text-gray-400">{car.year}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${scoreColour}`}>
                    {car.scoreLabel} · {car.score}/100
                  </span>
                </Link>
                <button
                  onClick={() => handleRemove(car.registration)}
                  className="text-xs text-gray-600 hover:text-red-400 shrink-0 transition-colors"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
