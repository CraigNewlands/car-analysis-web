const STORAGE_KEY = "autointel_saved_cars";

export interface SavedCar {
  registration: string;
  make: string;
  model: string;
  year: string;
  savedAt: string;
  score: number;
  scoreLabel: string;
  scoreColour: "green" | "yellow" | "red";
}

export function getSavedCars(): SavedCar[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isCarSaved(registration: string): boolean {
  return getSavedCars().some((c) => c.registration === registration);
}

export function saveCar(car: SavedCar): void {
  const cars = getSavedCars().filter((c) => c.registration !== car.registration);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([car, ...cars]));
}

export function removeCar(registration: string): void {
  const cars = getSavedCars().filter((c) => c.registration !== registration);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
}
