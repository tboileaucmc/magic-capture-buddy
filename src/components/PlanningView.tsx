import { useMemo, useState } from "react";
import { Plus, Trash2, Calendar as CalIcon, Mail, Download, MapPin, Link as LinkIcon, Paperclip, ChevronLeft, ChevronRight, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { BroadcastDialog } from "@/components/BroadcastDialog";
import { supabase } from "@/integrations/supabase/client";

import { usePlanning } from "@/lib/planning-store";
import type { Assignment, HalfDay } from "@/lib/planning-types";
import { assignmentSlots } from "@/lib/planning-types";
import { downloadICS, googleCalendarUrl, googlePayload, mailtoUrl, outlookCalendarUrl } from "@/lib/calendar-export";
import { sendMissionToCalendar } from "@/lib/google-calendar.functions";
import type { Technician as Tech } from "@/lib/planning-types";

/** Envoie l'ordre de mission depuis planning.cinemeccanica@gmail.com vers l'agenda des techniciens. */
function pushToCalendar(a: Assignment, techs: Tech[], okMsg: string) {
  sendMissionToCalendar({ data: googlePayload(a, techs) })
    .then(() => toast.success(okMsg))
    .catch((e) => toast.error(`Envoi agenda impossible : ${e instanceof Error ? e.message : e}`));
}
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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

/** Samedi et dimanche sont affichés et planifiables comme les autres jours. */
function isWeekend(d: Date): boolean {
  const wd = d.getDay(); // 0=Dim .. 6=Sam
  return wd === 0 || wd === 6;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type ViewMode = "1w" | "2w" | "1m";
const VIEW_DAYS: Record<ViewMode, number> = { "1w": 7, "2w": 14, "1m": 28 };
const VIEW_STEP: Record<ViewMode, number> = { "1w": 7, "2w": 14, "1m": 28 };

export function PlanningView() {
  const { data, upsertAssignment, deleteAssignment, addTechnician, removeTechnician, addCategory, removeCategory } = usePlanning();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("1w");
  const [editing, setEditing] = useState<{
    technicianId: string;
    dateISO: string;
    half: HalfDay;
    existing?: Assignment;
  } | null>(null);
  const [techDialog, setTechDialog] = useState(false);
  const [catDialog, setCatDialog] = useState(false);

  const dayCount = VIEW_DAYS[viewMode];

  const days = useMemo(() => {
    const out: Date[] = [];
    const cursor = new Date(weekStart);
    while (out.length < dayCount) {
      out.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [weekStart, dayCount]);

  const stepDays = VIEW_STEP[viewMode];

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
            <Button onClick={() => setCatDialog(true)} variant="secondary">
              <Plus /> Catégorie
            </Button>
            <BroadcastDialog />
            <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); window.location.replace("/auth"); }}>
              Déconnexion
            </Button>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {data.categories.map((c) => (
            <span key={c.id} className="group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs">
              <span className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
              <button
                type="button"
                className="ml-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                onClick={() => {
                  if (confirm(`Supprimer la catégorie "${c.label}" ? Les missions associées seront supprimées.`)) removeCategory(c.id);
                }}
                aria-label="Supprimer la catégorie"
              >
                ✕
              </button>
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
                  <th
                    key={i}
                    colSpan={2}
                    className={cn("border-b border-r p-2 text-center", isWeekend(d) && "bg-muted/90")}
                  >
                    <div className={cn("font-semibold", isWeekend(d) && "text-muted-foreground")}>
                      {DAY_NAMES[(d.getDay() + 6) % 7]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-muted/30">
                <th className="sticky left-0 z-10 border-b border-r bg-muted/30 p-1" />
                {days.flatMap((d, i) => [
                  <th key={`${i}-am`} className={cn("border-b border-r p-1 text-xs font-normal text-muted-foreground", isWeekend(d) && "bg-muted/60")}>Matin</th>,
                  <th key={`${i}-pm`} className={cn("border-b border-r p-1 text-xs font-normal text-muted-foreground", isWeekend(d) && "bg-muted/60")}>Après-midi</th>,
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
                          className={cn(
                            "cursor-pointer border-b border-r p-1 align-top transition hover:bg-accent/40",
                            isWeekend(d) && "bg-muted/40",
                          )}
                          style={{ minWidth: dayCount > 7 ? 64 : 72, height: 70, backgroundColor: cat?.color ? `${cat.color}22` : undefined }}
                          onClick={() => setEditing({ technicianId: t.id, dateISO, half: h, existing: a })}
                        >
                          {a ? (
                            <div className="flex h-full flex-col">
                              <div className="mb-1 flex items-center gap-1">
                                <span
                                  className="inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                                  style={{ backgroundColor: cat?.color }}
                                >
                                  {cat?.label}
                                </span>
                                {a.toConfirm ? (
                                  <Star
                                    className="size-3 shrink-0 fill-amber-400 text-amber-500"
                                    aria-label="A confirmer"
                                  />
                                ) : (
                                  <CheckCircle2
                                    className="size-3.5 shrink-0 text-emerald-600"
                                    strokeWidth={2.5}
                                    aria-label="Confirmé"
                                  />
                                )}
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

        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Cliquez sur une case pour planifier. Les données sont sauvegardées localement dans votre navigateur.</span>
          <span className="inline-flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-500" />
            mission à confirmer
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-emerald-600" strokeWidth={2.5} />
            RDV confirmé
          </span>
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

      <AddCategoryDialog
        open={catDialog}
        onOpenChange={setCatDialog}
        onAdd={(label, color) => {
          addCategory({ id: uid(), label, color });
          setCatDialog(false);
          toast.success("Catégorie ajoutée");
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
  const [toConfirm, setToConfirm] = useState(existing?.toConfirm ?? false);
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
      toConfirm: toConfirm || undefined,
      confirmed: toConfirm ? undefined : true,
      sequence:
        existing && !!existing.toConfirm !== toConfirm
          ? (existing.sequence ?? 0) + 1
          : existing?.sequence,
      attachments,
    };
    onSave(a);
    toast.success("Mission enregistrée");
    pushToCalendar(a, selectedTechs, "Ordre de mission envoyé dans l'agenda des techniciens");
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
    toConfirm,
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
          <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <input type="checkbox" checked={toConfirm} onChange={(e) => setToConfirm(e.target.checked)} className="size-4" />
            <span><strong>A confirmer</strong> — le technicien reçoit seulement « RDV à confirmer », sans adresse ni détails</span>
          </label>

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
            <Label>Techniciens assignés</Label>
            <div className="flex flex-wrap gap-2 rounded-md border p-2">
              {allTechnicians.length === 0 && (
                <span className="text-xs text-muted-foreground">Aucun technicien disponible.</span>
              )}
              {allTechnicians.map((t) => {
                const checked = technicianIds.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTech(t.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${checked ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                  >
                    {checked ? "✓ " : ""}{t.name}
                  </button>
                );
              })}
            </div>
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
              Laissez identique au début pour une mission d'une demi-journée. Les samedis et dimanches sont planifiables et
              inclus dans les périodes multi-jours.
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
            {(existing?.toConfirm || toConfirm) && (
              <Button
                onClick={() => {
                  if (!title.trim()) {
                    toast.error("Le titre est obligatoire");
                    return;
                  }
                  const confirmed: Assignment = {
                    ...currentAssignment,
                    id: existing?.id ?? uid(),
                    title: title.trim(),
                    toConfirm: undefined,
                    confirmed: true,
                    sequence: (existing?.sequence ?? 0) + 1,
                  };
                  onSave(confirmed);
                  setToConfirm(false);
                  pushToCalendar(confirmed, selectedTechs, "RDV confirmé : détails envoyés dans l'agenda des techniciens");
                }}
              >
                Confirmer le RDV
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={googleCalendarUrl(currentAssignment, selectedTechs)} target="_blank" rel="noreferrer">
                <CalIcon /> Google Agenda
              </a>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <CalIcon /> Outlook
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem
                  onClick={() => {
                    downloadICS(currentAssignment, selectedTechs);
                    toast.success("Fichier .ics téléchargé : ouvrez-le pour l'ajouter à Outlook");
                  }}
                >
                  Outlook (application) — .ics
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={outlookCalendarUrl(currentAssignment, selectedTechs, "work")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Outlook Web — créer l'ordre de mission
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>



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

const PRESET_COLORS = [
  "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#a855f7",
];

function AddCategoryDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (label: string, color: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une catégorie</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Intitulé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Ex: Réunion" />
          </div>
          <div className="grid gap-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-7 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Choisir ${c}`}
                />
              ))}
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer p-1"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Aperçu :
              <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1">
                <span className="size-3 rounded-full" style={{ backgroundColor: color }} />
                {label || "Nouvelle catégorie"}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!label.trim()) { toast.error("Intitulé requis"); return; }
              onAdd(label.trim(), color);
              setLabel(""); setColor(PRESET_COLORS[0]);
            }}
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
