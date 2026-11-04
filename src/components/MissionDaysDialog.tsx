import { useState } from "react";
import { CalendarDays, Pencil } from "lucide-react";
import { missionDates } from "@/lib/planning-week-edit";
import type { Assignment } from "@/lib/planning-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function MissionDaysDialog({ mission, dateISO, technicianName, light, onClose, onEntire, onDays }: {
  mission: Assignment; dateISO: string; technicianName: string; light: boolean;
  onClose: () => void; onEntire: () => void; onDays: (dates: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([dateISO]);
  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className={light ? "cmc-theme-light" : "cmc-theme"}>
      <DialogHeader><DialogTitle>Modifier la mission sur plusieurs jours</DialogTitle><DialogDescription>{mission.title} · {technicianName}</DialogDescription></DialogHeader>
      <div className="grid gap-3">
        {missionDates(mission).map((date) => <label key={date} className="flex cursor-pointer items-center gap-3 text-sm">
          <Checkbox checked={selected.includes(date)} onCheckedChange={(checked) => setSelected((days) => checked === true ? [...days, date] : days.filter((day) => day !== date))} />
          {new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </label>)}
      </div>
      <Button disabled={!selected.length} onClick={() => onDays(selected)}><Pencil /> Modifier les jours sélectionnés</Button>
      <Button variant="outline" onClick={onEntire}><CalendarDays /> Toute la mission · tous les techniciens</Button>
    </DialogContent>
  </Dialog>;
}