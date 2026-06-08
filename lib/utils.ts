// Utility helpers used across the app.
// `clsx` is used to conditionally build a className string from values
// (strings, arrays, objects). `tailwind-merge` resolves Tailwind CSS
// class conflicts (e.g. "p-2 p-4" -> keeps the last one) so that
// dynamically composed class lists behave predictably.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// `cn` — compose + merge className values safely.
// Accepts the same inputs as `clsx` and then runs the resulting string
// through `twMerge` to ensure Tailwind utility conflicts are resolved.
// This lets components freely pass conditional class lists without
// worrying about duplicated or conflicting Tailwind utilities.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
