import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPowerScaleLabel(scale: number): string {
  if (scale < 50) return "Human Level"
  if (scale < 100) return "Wall Level"
  if (scale < 500) return "Building Level"
  if (scale < 800) return "City Level"
  if (scale < 900) return "Continental Level"
  if (scale < 950) return "Planetary Level"
  if (scale < 1000) return "Galactic Level"
  return "Universal / Multiversal Level"
}
