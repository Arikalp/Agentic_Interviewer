/**
 * ============================================================
 * FILE: utils.ts
 * PURPOSE: Shared className utility helper
 * ============================================================
 *
 * This file exports the `cn()` function, which is used EVERYWHERE
 * in the component layer to compose CSS class names.
 *
 * WHY TWO LIBRARIES?
 *  - `clsx`         : Combines class values conditionally
 *                     (strings, arrays, objects with truthy/falsy keys)
 *  - `tailwind-merge`: Resolves Tailwind CSS utility conflicts.
 *                     Without it, "p-2 p-4" would apply both, but the
 *                     browser would use the last one by specificity.
 *                     tailwind-merge intelligently keeps only the last
 *                     conflicting class (e.g., keeps "p-4").
 *
 * USAGE:
 *   cn('base-class', isActive && 'active', { 'hidden': !show })
 *   cn('p-2', props.className, 'p-4')  // -> 'p-4' (conflict resolved)
 * ============================================================
 */

// Utility helpers used across the app.
// `clsx` is used to conditionally build a className string from values
// (strings, arrays, objects). `tailwind-merge` resolves Tailwind CSS
// class conflicts (e.g. "p-2 p-4" -> keeps the last one) so that
// dynamically composed class lists behave predictably.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * cn (classNames)
 * ---------------
 * Compose and merge CSS class names in a safe, conflict-free way.
 *
 * HOW IT WORKS:
 *  1. `clsx(inputs)` evaluates all arguments:
 *     - Strings are kept as-is.
 *     - Arrays are flattened.
 *     - Objects: keys are included if their value is truthy.
 *  2. `twMerge(...)` then resolves any Tailwind utility conflicts,
 *     keeping the last conflicting class in the list.
 *
 * This lets components freely mix conditional classes without
 * worrying about duplicated or conflicting Tailwind utilities.
 *
 * @param inputs - Any mix of strings, arrays, or conditional objects.
 * @returns      - A single merged className string.
 *
 * Example:
 *   cn('text-sm', isLarge && 'text-lg', 'text-sm')
 *   -> 'text-lg'  (conflict resolved, last wins)
 */
// `cn` — compose + merge className values safely.
// Accepts the same inputs as `clsx` and then runs the resulting string
// through `twMerge` to ensure Tailwind utility conflicts are resolved.
// This lets components freely pass conditional class lists without
// worrying about duplicated or conflicting Tailwind utilities.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
