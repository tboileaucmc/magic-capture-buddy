import { useMemo, useState } from "react";
import { Plus, Trash2, Calendar as CalIcon, Mail, Download, MapPin, Link as LinkIcon, Paperclip, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { usePlanning } from "@/lib/planning-store";
import type { Assignment, HalfDay } from "@/lib/planning-types";
import { assignmentSlots } from "@/lib/planning-types";
import { downloadICS, googleCalendarUrl, mailtoUrl } from "@/lib/calendar-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HALVES: HalfDay[] = ["AM", "PM"];
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type ViewMode = "1w" | "2w" | "1m";
const VIEW_DAYS: Record<ViewMode, number> = { "1w": 5, "2w": 10, "1m": 20 };

export function PlanningView() {
  const { data, upsertAssignment, deleteAssignment, addTechnician, removeTechnician } = usePlanning();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("1w");
  const [editing, setEditing] = useState<{
    technicianId: string;
    dateISO: string;
    half: HalfDay;
    existing?: Assignment;
  } | null>(null);
  const [techDialog, setTechDialog] = useState(false);

  const dayCount = VIEW_DAYS[viewMode];

  const days = useMemo(() => {
    const out: Date[] = [];
    const cursor = new Date(weekStart);
    while (out.length < dayCount) {
      const wd = cursor.getDay(); // 0=Sun .. 6=Sat
      if (wd !== 0 && wd !== 6) out.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [weekStart, dayCount]);

  const stepDays = dayCount === 5 ? 7 : dayCount === 10 ? 14 : 28;

  const findAssignment = (techId: string, dateISO: string, half: HalfDay) =>
    data.assignments.find((a) => {
      if (!a.technicianIds.includes(techId)) return false;
      return assignmentSlots(a).some((s) => s.dateISO === dateISO && s.half === half);
    });

  const categoryById = (id: string) => data.categories.find((c) => c.id === id);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Planning Techniciens</h1>
            <p className="text-sm text-muted-foreground">
              Du {days[0]?.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
              {" au "}
              {days[days.length - 1]?.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1w">1 semaine</SelectItem>
                <SelectItem value="2w">2 semaines</SelectItem>
                <SelectItem value="1m">1 mois</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => {
              const d = new Date(weekStart); d.setDate(d.getDate() - stepDays); setWeekStart(d);
            }}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              Aujourd'hui
            </Button>
            <Input
              type="date"
              className="w-[160px]"
              value={(() => {
                const p = (n: number) => String(n).padStart(2, "0");
                return `${weekStart.getFullYear()}-${p(weekStart.getMonth() + 1)}-${p(weekStart.getDate())}`;
              })()}
              onChange={(e) => {
                if (!e.target.value) return;
                const [y, m, d] = e.target.value.split("-").map(Number);
                setWeekStart(startOfWeek(new Date(y, m - 1, d)));
              }}
            />
            <Button variant="outline" size="icon" onClick={() => {
              const d = new Date(weekStart); d.setDate(d.getDate() + stepDays); setWeekStart(d);
            }}>
              <ChevronRight />
            </Button>
            <Button onClick={() => setTechDialog(true)} variant="secondary">
              <Plus /> Technicien
            </Button>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {data.categories.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs">
              <span className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-10 min-w-[160px] border-b border-r bg-muted/50 p-2 text-left">
                  Technicien
                </th>
                {days.map((d, i) => (
                  <th key={i} colSpan={2} className="border-b border-r p-2 text-center">
                    <div className="font-semibold">{DAY_NAMES[i]}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-muted/30">
                <th className="sticky left-0 z-10 border-b border-r bg-muted/30 p-1" />
                {days.flatMap((_, i) => [
                  <th key={`${i}-am`} className="border-b border-r p-1 text-xs font-normal text-muted-foreground">Matin</th>,
                  <th key={`${i}-pm`} className="border-b border-r p-1 text-xs font-normal text-muted-foreground">Après-midi</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {data.technicians.length === 0 && (
                <tr>
                  <td colSpan={1 + dayCount * 2} className="p-6 text-center text-muted-foreground">
                    Aucun technicien. Cliquez sur "Technicien" pour en ajouter.
                  </td>
                </tr>
              )}
              {data.technicians.map((t) => (
                <tr key={t.id}>
                  <td className="sticky left-0 z-10 border-b border-r bg-card p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.email}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Supprimer ${t.name} ?`)) removeTechnician(t.id);
                        }}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </td>
                  {days.map((d) => {
                    const dateISO = fmtISO(d);
                    return HALVES.map((h) => {
                      const a = findAssignment(t.id, dateISO, h);
                      const cat = a ? categoryById(a.categoryId) : null;
                      const isFirst = a ? a.dateISO === dateISO && a.half === h : false;
                      return (
                        <td
                          key={`${dateISO}-${h}`}
                          className="cursor-pointer border-b border-r p-1 align-top transition hover:bg-accent/40"
                          style={{ minWidth: dayCount > 5 ? 70 : 110, height: 70, backgroundColor: cat?.color ? `${cat.color}22` : undefined }}
                          onClick={() => setEditing({ technicianId: t.id, dateISO, half: h, existing: a })}
                        >
                          {a ? (
                            <div className="flex h-full flex-col">
                              <div
                                className="mb-1 inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                                style={{ backgroundColor: cat?.color }}
                              >
                                {cat?.label}
                              </div>
                              <div className="line-clamp-2 text-xs font-medium">{a.title}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {isFirst ? `${a.startTime}–${a.endTime}` : "…"}
                                {isFirst && a.endDateISO && a.endDateISO !== a.dateISO && " →"}
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground/40">
                              <Plus className="size-4" />
                            </div>
                          )}
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Cliquez sur une case pour planifier. Les données sont sauvegardées localement dans votre navigateur.
        </p>
      </div>

      {editing && (
        <AssignmentDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          allTechnicians={data.technicians}
          initialTechnicianId={editing.technicianId}
          categories={data.categories}
          dateISO={editing.dateISO}
          half={editing.half}
          existing={editing.existing}
          onSave={(a) => {
            upsertAssignment(a);
            setEditing(null);
          }}
          onDelete={(id) => {
            deleteAssignment(id);
            setEditing(null);
          }}
        />
      )}

      <AddTechnicianDialog
        open={techDialog}
        onOpenChange={setTechDialog}
        onAdd={(name, email) => {
          addTechnician({ id: uid(), name, email });
          setTechDialog(false);
          toast.success("Technicien ajouté");
        }}
      />
    </div>
  );
}

function AssignmentDialog({
  open,
  onOpenChange,
  allTechnicians,
  initialTechnicianId,
  categories,
  dateISO,
  half,
  existing,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  allTechnicians: ReturnType<typeof usePlanning>["data"]["technicians"];
  initialTechnicianId: string;
  categories: ReturnType<typeof usePlanning>["data"]["categories"];
  dateISO: string;
  half: HalfDay;
  existing?: Assignment;
  onSave: (a: Assignment) => void;
  onDelete: (id: string) => void;
}) {
  const defaultStart = half === "AM" ? "08:00" : "13:30";
  const defaultEnd = half === "AM" ? "12:00" : "17:30";

  const [technicianIds, setTechnicianIds] = useState<string[]>(
    existing?.technicianIds ?? [initialTechnicianId],
  );
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [startTime, setStartTime] = useState(existing?.startTime ?? defaultStart);
  const [endTime, setEndTime] = useState(existing?.endTime ?? defaultEnd);
  const [endDateISO, setEndDateISO] = useState(existing?.endDateISO ?? existing?.dateISO ?? dateISO);
  const [endHalf, setEndHalf] = useState<HalfDay>(existing?.endHalf ?? existing?.half ?? half);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [link, setLink] = useState(existing?.link ?? "");
  const [attachments, setAttachments] = useState(existing?.attachments ?? []);

  const startISO = existing?.dateISO ?? dateISO;
  const startHalfVal = existing?.half ?? half;
  const selectedTechs = allTechnicians.filter((t) => technicianIds.includes(t.id));
  const toggleTech = (id: string) =>
    setTechnicianIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = await Promise.all(
      Array.from(files)
        .filter((f) => /^(image\/jpeg|application\/pdf|image\/png)$/.test(f.type))
        .filter((f) => f.size <= 5 * 1024 * 1024)
        .map(
          (f) =>
            new Promise<{ name: string; type: string; dataUrl: string }>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve({ name: f.name, type: f.type, dataUrl: r.result as string });
              r.readAsDataURL(f);
            }),
        ),
    );
    setAttachments((prev) => [...prev, ...arr]);
  };

  const save = () => {
    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    if (technicianIds.length === 0) {
      toast.error("Sélectionnez au moins un technicien");
      return;
    }
    const a: Assignment = {
      id: existing?.id ?? uid(),
      technicianIds,
      dateISO: startISO,
      half: startHalfVal,
      endDateISO: endDateISO !== startISO || endHalf !== startHalfVal ? endDateISO : undefined,
      endHalf: endDateISO !== startISO || endHalf !== startHalfVal ? endHalf : undefined,
      categoryId,
      title: title.trim(),
      address: address.trim(),
      startTime,
      endTime,
      notes: notes.trim() || undefined,
      link: link.trim() || undefined,
      attachments,
    };
    onSave(a);
    toast.success("Mission enregistrée");
  };

  const currentAssignment: Assignment = {
    id: existing?.id ?? "preview",
    technicianIds,
    dateISO: startISO,
    half: startHalfVal,
    endDateISO,
    endHalf,
    categoryId,
    title: title || "Mission",
    address,
    startTime,
    endTime,
    notes,
    link,
    attachments,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Modifier la mission" : "Nouvelle mission"}
          </DialogTitle>
          <DialogDescription>
            {new Date(dateISO).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
            {" • "}
            {half === "AM" ? "Matin" : "Après-midi"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Catégorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Intitulé / Affaire</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex: Rénovation cuisine - Mr Dupont" />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1"><MapPin className="size-3.5" /> Adresse / Lieu</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={250} placeholder="12 rue de la Paix, 75002 Paris" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Début</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2 rounded-md border bg-muted/20 p-3">
            <Label className="text-xs uppercase text-muted-foreground">Période de la mission</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto,1fr,auto]">
              <div className="grid gap-1">
                <Label className="text-xs">Du</Label>
                <Input type="date" value={startISO} disabled />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">&nbsp;</Label>
                <div className="rounded border bg-muted px-2 py-1.5 text-xs">
                  {startHalfVal === "AM" ? "Matin" : "Après-midi"}
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Au</Label>
                <Input
                  type="date"
                  value={endDateISO}
                  min={startISO}
                  onChange={(e) => setEndDateISO(e.target.value || startISO)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">&nbsp;</Label>
                <Select value={endHalf} onValueChange={(v) => setEndHalf(v as HalfDay)}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">Matin</SelectItem>
                    <SelectItem value="PM">Après-midi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Laissez identique au début pour une mission d'une demi-journée. Les week-ends sont automatiquement ignorés.
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1"><LinkIcon className="size-3.5" /> Lien (optionnel)</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} placeholder="https://…" />
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1"><Paperclip className="size-3.5" /> Pièces jointes (JPEG, PNG, PDF — 5 Mo max)</Label>
            <Input type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={(e) => handleFiles(e.target.files)} />
            {attachments.length > 0 && (
              <ul className="space-y-1 text-sm">
                {attachments.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded border bg-muted/30 px-2 py-1">
                    <a href={f.dataUrl} download={f.name} className="truncate underline">{f.name}</a>
                    <Button variant="ghost" size="icon" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {address && (
            <div className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-2 text-xs">
              <a className="underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">Ouvrir dans Google Maps</a>
              <span>•</span>
              <a className="underline" href={`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`} target="_blank" rel="noreferrer">Ouvrir dans Waze</a>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {existing && (
              <Button variant="destructive" onClick={() => onDelete(existing.id)}>
                <Trash2 /> Supprimer
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={googleCalendarUrl(currentAssignment, selectedTechs)} target="_blank" rel="noreferrer">
                <CalIcon /> Google Agenda
              </a>
            </Button>
            <Button variant="outline" onClick={() => downloadICS(currentAssignment, selectedTechs)}>
              <Download /> .ics
            </Button>
            <Button variant="outline" asChild>
              <a href={mailtoUrl(currentAssignment, selectedTechs)}>
                <Mail /> Email
              </a>
            </Button>
            <Button onClick={save}>Valider</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTechnicianDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (name: string, email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un technicien</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            if (!name.trim() || !email.trim()) { toast.error("Nom et email requis"); return; }
            onAdd(name.trim(), email.trim());
            setName(""); setEmail("");
          }}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
