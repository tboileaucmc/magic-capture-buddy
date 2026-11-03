import type { Category } from "./planning-types";

/** A display fallback, never a persisted mission or a calendar invitation. */
export function defaultSupportCategory(technicianId: string, supportIds: ReadonlySet<string>, categories: Category[], occupied = false): Category | undefined {
  if (occupied || !supportIds.has(technicianId)) return undefined;
  return categories.find((category) => category.label.trim().toUpperCase() === "NOC");
}