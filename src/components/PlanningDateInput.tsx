import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { parsePlanningDate } from "@/lib/planning-date";

export function PlanningDateInput({ value, onSelect }: { value: string; onSelect: (date: Date) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  function commit() {
    const date = parsePlanningDate(draft);
    if (date) onSelect(date);
    // The calendar shows the Monday of the selected week after validation.
    setDraft(value);
  }

  return (
    <Input
      type="date"
      aria-label="Date du planning"
      className="w-[160px]"
      min="1000-01-01"
      max="9999-12-31"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}