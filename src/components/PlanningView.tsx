import { Fragment, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Calendar as CalIcon, Mail, Download, MapPin, Link as LinkIcon, Paperclip, ChevronLeft, ChevronRight, ChevronDown, Shield, Tags, History, Star, CheckCircle2, Sun, Moon, Pencil, Video, Repeat, Copy, FileText, Users, Clock } from "lucide-react";
import { duplicateWeek } from "@/lib/planning-duplicate";
import { openWaze } from "@/lib/waze";
import { toast } from "sonner";
import { BroadcastDialog } from "@/components/BroadcastDialog";
import { UsersDialog } from "@/components/UsersDialog";
import { useRole } from "@/lib/use-role";
import { SupportHistoryDialog } from "@/components/SupportHistoryDialog";
import { WeekNumberInput } from "@/components/WeekNumberInput";
import { TechnicianProfileDialog } from "@/components/TechnicianProfileDialog";
import { supportTechnicianIds, isSupportOnly } from "@/lib/planning-support";
import { CinemaAddressSuggestions } from "@/components/CinemaAddressSuggestions";
import { PlanningDateInput } from "@/components/PlanningDateInput";
import { frenchHolidayName, planningDayKind } from "@/lib/planning-day";
import { ATTACHMENT_ACCEPT, attachmentMimeType } from "@/lib/planning-attachments";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/logo-cmc.png.asset.json";

import { usePlanning } from "@/lib/planning-store";
import type { Assignment, HalfDay } from "@/lib/planning-types";
import { assignmentOccursOn, nextWeeklyDate } from "@/lib/planning-recurrence";
import { downloadICS, googleCalendarUrl, googlePayload, mailtoUrl, outlookCalendarUrl, normalizeTeamsUrl } from "@/lib/calendar-export";
import { sendMissionToCalendar, cancelMissionInCalendar } from "@/lib/google-calendar.functions";
import type { Technician as Tech } from "@/lib/planning-types";

/** Envoie l'ordre de mission depuis planning.cinemeccanica@gmail.com vers l'agenda des techniciens. */
function pushToCalendar(a: Assignment, techs: Tech[], okMsg: string, onMeet?: (url: string | undefined) => void) {
  sendMissionToCalendar({ data: googlePayload(a, techs) })
    .then((r) => {
      toast.success(r.meetUrl ? `${okMsg} avec le lien Google Meet` : okMsg);
      if (onMeet && r.meetUrl && r.meetUrl !== a.meetUrl) onMeet(r.meetUrl);
    })
    .catch((e) => toast.error(`Envoi agenda impossible : ${e instanceof Error ? e.message : e}`));
}
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function dayClass(d: Date): string | undefined {
  const kind = planningDayKind(d);
  return kind === "weekday" ? undefined : `planning-${kind}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type ViewMode = "1w" | "2w" | "1m";
const VIEW_DAYS: Record<ViewMode, number> = { "1w": 7, "2w": 14, "1m": 28 };
const VIEW_STEP: Record<ViewMode, number> = { "1w": 7, "2w": 14, "1m": 28 };

export function PlanningView({ light, onToggleTheme }: { light: boolean; onToggleTheme: () => void }) {
  const { data, upsertAssignment, deleteAssignment, addTechnician, updateTechnician, removeTechnician, addCategory, removeCategory, updateCategoryColor, addAssignments } = usePlanning();
  const { role, canEdit, isSupportEditor, isAdmin } = useRole();
  const supportIds = useMemo(() => supportTechnicianIds(data.technicians), [data.technicians]);
  const canEditTech = (id: string) => canEdit || (isSupportEditor && supportIds.has(id));
  const canEditMission = (a: Assignment) => canEdit || (isSupportEditor && isSupportOnly(a.technicianIds, supportIds));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("1w");
  const [editing, setEditing] = useState<{
    technicianId: string;
    dateISO: string;
    half: HalfDay;
    existing?: Assignment;
  } | null>(null);
  const [techDialog, setTechDialog] = useState(false);
  const [editingTech, setEditingTech] = useState<Tech | null>(null);
  const [catDialog, setCatDialog] = useState(false);
  const [adminDialog, setAdminDialog] = useState<"broadcast" | "users" | "history" | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupTarget, setDupTarget] = useState("");
  const [dupTechs, setDupTechs] = useState<Set<string>>(new Set());
  const dupCandidates = data.technicians.filter((t) => canEditTech(t.id));
  const openDuplicate = () => {
    const next = new Date(weekStart); next.setDate(next.getDate() + 7);
    setDupTarget(fmtISO(next));
    setDupTechs(new Set(dupCandidates.map((t) => t.id)));
    setDupOpen(true);
  };
  const runDuplicate = () => {
    const [y, m, d] = dupTarget.split("-").map(Number);
    const target = y ? new Date(y, m - 1, d) : null;
    if (!target || isNaN(target.getTime())) { toast.error("Date invalide"); return; }
    if (dupTechs.size === 0) { toast.error("Choisissez au moins un technicien"); return; }
    const targetMonday = startOfWeek(target);
    if (fmtISO(targetMonday) === fmtISO(weekStart)) { toast.error("Choisissez une autre semaine"); return; }
    const copies = duplicateWeek(data.assignments, fmtISO(weekStart), fmtISO(targetMonday), canEditMission, uid, dupTechs);
    if (copies.length === 0) { toast.info("Aucune mission à dupliquer pour ces techniciens"); return; }
    addAssignments(copies);
    setDupOpen(false);
    setWeekStart(targetMonday);
    toast.success(`${copies.length} mission(s) dupliquée(s) — invitations non envoyées`);
  };
  const cancelMission = useServerFn(cancelMissionInCalendar);

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

  const findAssignments = (techId: string, dateISO: string, half: HalfDay) =>
    data.assignments.filter((a) => {
      if (!a.technicianIds.includes(techId)) return false;
      return assignmentOccursOn(a, dateISO, half);
    });

  const categoryById = (id: string) => data.categories.find((c) => c.id === id);


  return (
    <div className="planning-surface min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-[1400px]">
        <header className="planning-header mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex max-w-full flex-wrap items-center gap-5">
            <img src={logoAsset.url} alt="Cinemeccanica France" width={1010} height={320} className="h-auto w-[220px] max-w-full shrink-0 object-contain" />
            <div>
            <h1 className="text-2xl font-bold">Planning Techniciens</h1>
            <p className="text-sm text-muted-foreground">
              Du {days[0]?.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
              {" au "}
              {days[days.length - 1]?.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
            </div>
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
            <WeekNumberInput weekStart={weekStart} onSelect={(d) => setWeekStart(startOfWeek(d))} />
            <PlanningDateInput
              value={fmtISO(weekStart)}
              onSelect={(date) => setWeekStart(startOfWeek(date))}
            />
            <Button variant="outline" size="icon" onClick={() => {
              const d = new Date(weekStart); d.setDate(d.getDate() + stepDays); setWeekStart(d);
            }}>
              <ChevronRight />
            </Button>
            {(canEdit || isSupportEditor) && (
              <Button
                variant="secondary"
                title="Copier les missions de la semaine affichée vers une autre semaine"
                onClick={openDuplicate}
              >
                <Copy /> Dupliquer la semaine
              </Button>
            )}
            <Dialog open={dupOpen} onOpenChange={setDupOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dupliquer la semaine</DialogTitle>
                  <DialogDescription>
                    Missions de la semaine du {weekStart.toLocaleDateString("fr-FR")}. Les invitations ne sont pas envoyées.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dup-target">Vers la semaine du</Label>
                    <Input id="dup-target" type="date" value={dupTarget} onChange={(e) => setDupTarget(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Techniciens</Label>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setDupTechs(new Set(dupCandidates.map((t) => t.id)))}>Tous</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setDupTechs(new Set())}>Aucun</Button>
                      </div>
                    </div>
                    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3">
                      {dupCandidates.map((t) => (
                        <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={dupTechs.has(t.id)}
                            onCheckedChange={(v) => setDupTechs((s) => { const n = new Set(s); if (v) n.add(t.id); else n.delete(t.id); return n; })}
                          />
                          {t.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDupOpen(false)}>Annuler</Button>
                  <Button onClick={runDuplicate}><Copy /> Dupliquer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {(canEdit || isAdmin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary"><Shield /> Administrateur <ChevronDown /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={`w-56 ${light ? "cmc-theme-light" : "cmc-theme"}`}>
                  {canEdit && <>
                    <DropdownMenuItem onSelect={() => setTechDialog(true)}><Users /> Techniciens</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setCatDialog(true)}><Tags /> Catégories</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setAdminDialog("broadcast")}><Mail /> Envoyer le planning</DropdownMenuItem>
                  </>}
                  {isAdmin && <>
                    <DropdownMenuItem onSelect={() => setAdminDialog("users")}><Users /> Utilisateurs</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setAdminDialog("history")}><History /> Historique support</DropdownMenuItem>
                  </>}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canEdit && <BroadcastDialog open={adminDialog === "broadcast"} onOpenChange={(open) => setAdminDialog(open ? "broadcast" : null)} />}
            {isAdmin && <UsersDialog open={adminDialog === "users"} onOpenChange={(open) => setAdminDialog(open ? "users" : null)} />}
            {isAdmin && <SupportHistoryDialog open={adminDialog === "history"} onOpenChange={(open) => setAdminDialog(open ? "history" : null)} />}
            {isSupportEditor && (
              <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">Écriture : support</span>
            )}
            {role === "viewer" && (
              <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">Lecture seule</span>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleTheme}
              title={light ? "Passer en mode foncé" : "Passer en mode clair"}
              aria-label={light ? "Passer en mode foncé" : "Passer en mode clair"}
            >
              {light ? <Moon /> : <Sun />}
            </Button>
            <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); window.location.replace("/auth"); }}>
              Déconnexion
            </Button>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {data.categories.map((c) => (
            <span key={c.id} className="group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs">
              {canEdit ? (
                <label className="relative size-4 cursor-pointer rounded-full ring-offset-1 hover:ring-2 hover:ring-primary" style={{ backgroundColor: c.color }} title="Changer la couleur">
                  <input
                    type="color"
                    value={c.color}
                    onChange={(e) => updateCategoryColor(c.id, e.target.value)}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                    aria-label={`Couleur de ${c.label}`}
                  />
                </label>
              ) : (
                <span className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
              )}
              {c.label}
              {canEdit && <button
                type="button"
                className="ml-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                onClick={() => {
                  if (confirm(`Supprimer la catégorie "${c.label}" ? Les missions associées seront supprimées.`)) removeCategory(c.id);
                }}
                aria-label="Supprimer la catégorie"
              >
                ✕
              </button>}
            </span>
          ))}
        </div>

        <div className="planning-grid overflow-x-auto rounded-lg border bg-card">
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
                    className={cn("border-b border-r p-2 text-center", dayClass(d))}
                    title={frenchHolidayName(d)}
                  >
                    <div className="font-semibold">
                      {DAY_NAMES[(d.getDay() + 6) % 7]}{frenchHolidayName(d) && " · Férié"}
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
                  <th key={`${i}-am`} className={cn("border-b border-r p-1 text-xs font-normal text-muted-foreground", dayClass(d))}>Matin</th>,
                  <th key={`${i}-pm`} className={cn("border-b border-r p-1 text-xs font-normal text-muted-foreground", dayClass(d))}>Après-midi</th>,
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
                <Fragment key={t.id}>
                {t.name.toUpperCase().includes("BRABANT") && (
                  <tr aria-hidden="true">
                    <td className="sticky left-0 z-10 border-b border-r bg-muted/50 p-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Support</div>
                    </td>
                    {days.map((d) =>
                      HALVES.map((h) => (
                        <td key={`support-${fmtISO(d)}-${h}`} className="border-b border-r bg-muted/50 p-1" />
                      )),
                    )}
                  </tr>
                )}
                <tr>
                  <td className="sticky left-0 z-10 border-b border-r bg-card p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <TechnicianProfileDialog technicianId={t.id} name={t.name} light={light} readOnly={!isAdmin} />
                        {canEdit && <div className="text-xs text-muted-foreground">{t.email}</div>}
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTech(t)}
                            aria-label={`Modifier ${t.name}`}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Supprimer ${t.name} ?`)) removeTechnician(t.id);
                            }}
                            aria-label={`Supprimer ${t.name}`}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                  {days.map((d) => {
                    const dateISO = fmtISO(d);
                    const amList = findAssignments(t.id, dateISO, "AM");
                    const pmList = findAssignments(t.id, dateISO, "PM");
                    const merged = amList.length > 0 && amList.length === pmList.length && amList.every((a, i) => a.id === pmList[i].id);
                    return (merged ? (["AM"] as HalfDay[]) : HALVES).map((h) => {
                      const list = h === "AM" ? amList : pmList;
                      const single = list.length === 1 ? list[0] : null;
                      const singleCat = single ? categoryById(single.categoryId) : null;
                      return (
                        <td
                          key={`${dateISO}-${h}`}
                          colSpan={merged ? 2 : undefined}
                          className={cn(
                            "cursor-pointer border-b border-r p-1 align-top transition hover:bg-accent/40",
                            dayClass(d),
                          )}
                          style={{ minWidth: dayCount > 7 ? 64 : 72, height: 70, backgroundColor: singleCat?.color ? `${singleCat.color}22` : undefined }}
                          onClick={() => canEditTech(t.id) && setEditing({ technicianId: t.id, dateISO, half: h })}
                        >
                          {list.length > 0 ? (
                            <div className="flex min-h-[61px] flex-col gap-1">
                              {list.map((a) => {
                                const cat = categoryById(a.categoryId);
                                const isFirst = (a.recurrence === "weekly" || a.dateISO === dateISO) && (merged || a.half === h);
                                return (
                                  <div
                                    key={a.id}
                                    className="flex min-h-[56px] min-w-0 flex-col rounded-sm border border-border/40 p-0.5"
                                    style={{ backgroundColor: cat?.color ? `${cat.color}22` : undefined }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!canEditMission(a)) return;
                                      setEditing({ technicianId: t.id, dateISO, half: h, existing: a });
                                    }}
                                  >
                                    <div className="mb-0.5 flex items-center gap-1">
                                      {a.recurrence && <Repeat className="size-3 shrink-0 text-primary" aria-label="Chaque semaine" />}
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
                                    <div className={cn("text-xs font-medium", list.length > 1 ? "line-clamp-1" : "line-clamp-2")}>{a.title}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {isFirst ? `${a.startTime}–${a.endTime}` : "…"}
                                      {isFirst && a.endDateISO && a.endDateISO !== a.dateISO && " →"}
                                    </div>
                                  </div>
                                );
                              })}
                              {canEditTech(t.id) && (
                                <div className="flex items-center justify-center text-muted-foreground/40">
                                  <Plus className="size-3" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex min-h-[61px] items-center justify-center text-muted-foreground/40">
                              <Plus className="size-4" />
                            </div>
                          )}
                        </td>
                      );
                    });
                  })}
                </tr>
                </Fragment>
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
          light={light}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          allTechnicians={canEdit ? data.technicians : data.technicians.filter((t) => supportIds.has(t.id))}
          initialTechnicianId={editing.technicianId}
          categories={data.categories}
          dateISO={editing.dateISO}
          half={editing.half}
          existing={editing.existing}
          onSave={(a) => {
            upsertAssignment(a);
            setEditing(null);
          }}
          onDelete={async (id) => {
            await cancelMission({ data: { id } });
            deleteAssignment(id);
            setEditing(null);
            toast.success("Mission supprimée et annulation envoyée aux techniciens");
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

      {editingTech && (
        <EditTechnicianDialog
          key={editingTech.id}
          open
          technician={editingTech}
          onOpenChange={(o) => !o && setEditingTech(null)}
          onSave={(name: string, email: string) => {
            updateTechnician({ ...editingTech, name, email });
            setEditingTech(null);
            toast.success("Technicien mis à jour");
          }}
        />
      )}

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
  light,
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
  light: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  allTechnicians: ReturnType<typeof usePlanning>["data"]["technicians"];
  initialTechnicianId: string;
  categories: ReturnType<typeof usePlanning>["data"]["categories"];
  dateISO: string;
  half: HalfDay;
  existing?: Assignment;
  onSave: (a: Assignment) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const defaultStart = half === "AM" ? "08:00" : "13:30";
  const defaultEnd = half === "AM" ? "12:00" : "17:30";

  const [technicianIds, setTechnicianIds] = useState<string[]>(
    existing?.technicianIds ?? [initialTechnicianId],
  );
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? "");
  const titlePrefill = (label?: string) =>
    label === "Affaires" ? "AFF " : label === "Maintenance" ? "Maintenance " : "";
  const initialCategory = categories.find((c) => c.id === (existing?.categoryId ?? categories[0]?.id));
  const initialPrefill = existing?.title ? "" : titlePrefill(initialCategory?.label);
  const [title, setTitle] = useState(existing?.title ?? initialPrefill);
  const [lastPrefill, setLastPrefill] = useState(initialPrefill);
  const [addressSuggestionsActive, setAddressSuggestionsActive] = useState(false);
  const [address, setAddress] = useState(existing?.address ?? "");
  const [startTime, setStartTime] = useState(existing?.startTime ?? defaultStart);
  const [endTime, setEndTime] = useState(existing?.endTime ?? defaultEnd);
  const [endDateISO, setEndDateISO] = useState(existing?.endDateISO ?? existing?.dateISO ?? dateISO);
  const [endHalf, setEndHalf] = useState<HalfDay>(existing?.endHalf ?? existing?.half ?? half);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [link, setLink] = useState(existing?.link ?? "");
  const [teamsUrl, setTeamsUrl] = useState(existing?.teamsUrl ?? "");
  const [googleMeet, setGoogleMeet] = useState(existing?.googleMeet ?? false);
  const [weekly, setWeekly] = useState(existing?.recurrence === "weekly");
  const [repeatDay, setRepeatDay] = useState(String(new Date(`${existing?.dateISO ?? dateISO}T00:00:00Z`).getUTCDay()));
  const [toConfirm, setToConfirm] = useState(existing?.toConfirm ?? false);
  const [fullDay, setFullDay] = useState(!!existing && existing.half === "AM" && existing.endHalf === "PM" && (existing.endDateISO ?? existing.dateISO) === existing.dateISO);
  const [fullWeek, setFullWeek] = useState(() => {
    if (!existing || existing.half !== "AM" || existing.endHalf !== "PM" || !existing.endDateISO) return false;
    const d = new Date(`${existing.dateISO}T00:00:00Z`);
    return d.getUTCDay() === 1 && existing.endDateISO === shiftISO(existing.dateISO, 4);
  });
  const [attachments, setAttachments] = useState(existing?.attachments ?? []);
  const [deleting, setDeleting] = useState(false);

  const [anchorISO, setAnchorISO] = useState(existing?.dateISO ?? dateISO);
  const isFullWeek = fullWeek && !weekly;
  const weekMondayISO = shiftISO(anchorISO, -((new Date(`${anchorISO}T00:00:00Z`).getUTCDay() + 6) % 7));
  const startISO = weekly ? nextWeeklyDate(anchorISO, Number(repeatDay)) : isFullWeek ? weekMondayISO : anchorISO;
  const isFullDay = (fullDay || isFullWeek) && !weekly;
  const missionEndTime = isFullDay ? "18:00" : endTime;
  const startHalfVal: HalfDay = weekly ? (startTime < "12:00" ? "AM" : "PM") : isFullDay ? "AM" : existing?.half ?? half;
  const missionEndISO = weekly ? startISO : isFullWeek ? shiftISO(weekMondayISO, 4) : isFullDay ? startISO : endDateISO;
  const missionEndHalf: HalfDay = weekly ? (endTime <= "12:00" ? "AM" : "PM") : isFullDay ? "PM" : endHalf;
  const validateWeekly = () => {
    if (weekly && (!startTime || !endTime || endTime <= startTime)) {
      toast.error("La fin de la réunion doit être après son début, le même jour");
      return false;
    }
    return true;
  };
  const selectedTechs = allTechnicians.filter((t) => technicianIds.includes(t.id));
  const toggleTech = (id: string) =>
    setTechnicianIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).flatMap((file) => {
      const type = attachmentMimeType(file);
      if (!type) {
        toast.error(`${file.name} : format non accepté ou taille supérieure à 5 Mo`);
        return [];
      }
      return [{ file, type }];
    });
    const arr = await Promise.all(
      accepted
        .map(
          ({ file: f, type }) =>
            new Promise<{ name: string; type: string; dataUrl: string }>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve({ name: f.name, type, dataUrl: r.result as string });
              r.readAsDataURL(f);
            }),
        ),
    );
    setAttachments((prev) => [...prev, ...arr]);
  };

  const save = () => {
    if (!validateWeekly()) return;
    if (teamsUrl.trim() && !normalizeTeamsUrl(teamsUrl)) {
      toast.error("Saisissez un lien de réunion Microsoft Teams valide (https://…)");
      return;
    }
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
      endDateISO: missionEndISO !== startISO || missionEndHalf !== startHalfVal ? missionEndISO : undefined,
      endHalf: missionEndISO !== startISO || missionEndHalf !== startHalfVal ? missionEndHalf : undefined,
      recurrence: weekly ? "weekly" : undefined,
      categoryId,
      title: title.trim(),
      address: address.trim(),
      startTime,
      endTime: missionEndTime,
      notes: notes.trim() || undefined,
      link: link.trim() || undefined,
      teamsUrl: normalizeTeamsUrl(teamsUrl),
      googleMeet: googleMeet || undefined,
      meetUrl: googleMeet ? existing?.meetUrl : undefined,
      toConfirm: toConfirm || undefined,
      confirmed: toConfirm ? undefined : true,
      sequence: existing ? (existing.sequence ?? 0) + 1 : 0,
      attachments,
    };
    onSave(a);
    toast.success("Mission enregistrée");
    pushToCalendar(a, selectedTechs, "Ordre de mission envoyé dans l'agenda des techniciens", (meetUrl) => onSave({ ...a, meetUrl }));
  };

  const currentAssignment: Assignment = {
    id: existing?.id ?? "preview",
    technicianIds,
    dateISO: startISO,
    half: startHalfVal,
    endDateISO: missionEndISO,
    endHalf: missionEndHalf,
    recurrence: weekly ? "weekly" : undefined,
    categoryId,
    title: title || "Mission",
    address,
    startTime,
    endTime: missionEndTime,
    notes,
    link,
    teamsUrl: normalizeTeamsUrl(teamsUrl),
    googleMeet,
    toConfirm,
    attachments,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!deleting) onOpenChange(o); }}>
      <DialogContent className={cn("mission-sheet flex max-h-[92dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-3xl", light ? "cmc-theme-light" : "cmc-theme")}>
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12 text-left">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><FileText className="size-4" /> Ordre de mission</div>
          <DialogTitle className="leading-snug">
            {existing?.recurrence ? "Modifier la série hebdomadaire" : existing ? "Modifier la mission" : "Nouvelle mission"}
          </DialogTitle>
          <DialogDescription>
            {new Date(dateISO).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
            {" • "}{half === "AM" ? "Matin" : "Après-midi"}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="mission" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid h-auto shrink-0 grid-cols-2 rounded-none border-b bg-background p-2">
            <TabsTrigger value="mission" className="gap-2 whitespace-normal px-1 py-2 data-[state=active]:text-primary"><Users className="hidden size-4 sm:block" />Mission et période</TabsTrigger>
            <TabsTrigger value="visio" className="gap-2 whitespace-normal px-1 py-2 data-[state=active]:text-primary"><Video className="hidden size-4 sm:block" />Visio et documents</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <TabsContent value="mission" className="mt-0 grid gap-5">
              <label className="flex items-start gap-3 border-b pb-4 text-sm">
                <Checkbox checked={toConfirm} onCheckedChange={(v) => setToConfirm(v === true)} className="mt-0.5" />
                <span className="space-y-1"><strong>À confirmer</strong><span className="block text-xs text-muted-foreground">Invitation sans adresse ni détails jusqu’à confirmation.</span></span>
              </label>
          <div className="grid gap-2">
            <Label htmlFor="mission-title">Intitulé / Affaire</Label>
            <Input id="mission-title" value={title} onChange={(e) => { setTitle(e.target.value); setAddressSuggestionsActive(true); }} maxLength={120} placeholder="Ex : Cinéma Pathé Beaugrenelle Paris" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mission-address" className="flex items-center gap-1"><MapPin className="size-3.5" /> Adresse / Lieu</Label>
            <Input id="mission-address" value={address} onChange={(e) => { setAddress(e.target.value); setAddressSuggestionsActive(false); }} maxLength={250} placeholder="12 rue de la Paix, 75002 Paris" />
            <CinemaAddressSuggestions title={title} active={addressSuggestionsActive} onSelect={(value) => { setAddress(value); setAddressSuggestionsActive(false); }} />
          </div>

          <div className="grid gap-2">
            <Label>Catégorie</Label>

            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                const cat = categories.find((c) => c.id === v);
                const prefill = titlePrefill(cat?.label);
                if (prefill && (!title.trim() || title === lastPrefill)) {
                  setTitle(prefill);
                  setLastPrefill(prefill);
                }
              }}
            >
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
            <div className="flex flex-wrap gap-2">
              {allTechnicians.length === 0 && (
                <span className="text-xs text-muted-foreground">Aucun technicien disponible.</span>
              )}
              {allTechnicians.map((t) => {
                const checked = technicianIds.includes(t.id);
                return (
                  <Button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTech(t.id)}
                    variant={checked ? "default" : "outline"}
                    size="sm"
                    aria-pressed={checked}
                    className="h-auto min-h-8 whitespace-normal text-xs"
                  >
                    {checked ? "✓ " : ""}{t.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {address && (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button variant="outline" size="sm" asChild><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"><MapPin /> Google Maps</a></Button>
              <Button variant="outline" size="sm" onClick={() => openWaze(address)}><MapPin /> Waze</Button>
            </div>
          )}
          <div className="grid gap-3 border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs uppercase text-muted-foreground">Période de la mission</Label>
              {!weekly && (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Checkbox checked={fullDay && !fullWeek} onCheckedChange={(v) => { setFullDay(v === true); if (v === true) { setFullWeek(false); setEndTime("18:00"); } }} />
                  Journée entière
                </label>
              )}
              {!weekly && (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Checkbox checked={fullWeek} onCheckedChange={(v) => { setFullWeek(v === true); if (v === true) { setFullDay(false); setEndTime("18:00"); } }} />
                  Semaine entière (lun.–ven.)
                </label>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
              <div className="grid gap-1">
                <Label className="text-xs">Du</Label>
                <Input type="date" value={startISO} disabled={weekly} onChange={(e) => { const v = e.target.value; if (!v) return; const delta = Math.round((Date.parse(`${v}T00:00:00Z`) - Date.parse(`${anchorISO}T00:00:00Z`)) / 86400000); setAnchorISO(v); setEndDateISO((d) => { const n = shiftISO(d, delta); return n < v ? v : n; }); }} />
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
                  value={missionEndISO}
                  disabled={weekly || isFullDay}
                  min={startISO}
                  onChange={(e) => setEndDateISO(e.target.value || startISO)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">&nbsp;</Label>
                <Select value={missionEndHalf} disabled={weekly || isFullDay} onValueChange={(v) => setEndHalf(v as HalfDay)}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">Matin</SelectItem>
                    <SelectItem value="PM">Après-midi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="mission-start">Début</Label>
              <Input id="mission-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mission-end">Fin</Label>
              <Input id="mission-end" type="time" value={isFullDay ? "18:00" : endTime} disabled={isFullDay} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 border-t pt-4">
            <div className="mt-2 flex items-center justify-between gap-3">
              <Label htmlFor="mission-weekly" className="flex items-center gap-2"><Repeat className="size-4" /> Répéter chaque semaine</Label>
              <Switch id="mission-weekly" checked={weekly} onCheckedChange={setWeekly} />
            </div>
            {weekly && (
              <div className="grid gap-3 border-l-2 border-primary pl-3">
                <div className="grid gap-2">
                  <Label htmlFor="mission-repeat-day">Jour de la réunion</Label>
                  <Select value={repeatDay} onValueChange={setRepeatDay}>
                    <SelectTrigger id="mission-repeat-day"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-sm text-muted-foreground">Chaque { ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][Number(repeatDay)] } à {startTime.replace(":", "h")} (heure de Paris) · Sans date de fin</span>
              </div>
            )}
          </div>


            </TabsContent>
            <TabsContent value="visio" className="mt-0 grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="mission-teams" className="flex items-center gap-1"><Video className="size-3.5" /> Réunion Teams (optionnel)</Label>
            <Input id="mission-teams" type="url" value={teamsUrl} onChange={(e) => setTeamsUrl(e.target.value)} maxLength={4000} placeholder="https://teams.microsoft.com/l/meetup-join/…" />
            {normalizeTeamsUrl(teamsUrl) && (
              <Button variant="outline" className="w-fit" asChild>
                <a href={normalizeTeamsUrl(teamsUrl)} target="_blank" rel="noopener noreferrer"><Video /> Rejoindre la réunion Teams</a>
              </Button>
            )}
            <div className="mt-2 flex items-center justify-between gap-3">
              <Label htmlFor="mission-meet" className="flex items-center gap-2"><Video className="size-4" /> Créer un lien Google Meet</Label>
              <Switch id="mission-meet" checked={googleMeet} onCheckedChange={setGoogleMeet} />
            </div>
            {googleMeet && (
              existing?.meetUrl ? (
                <Button variant="outline" className="w-fit" asChild>
                  <a href={existing.meetUrl} target="_blank" rel="noopener noreferrer"><Video /> Rejoindre la réunion Google Meet</a>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Le lien sera créé à l'enregistrement et ajouté à l'invitation{toConfirm ? " une fois le RDV confirmé" : ""}.</p>
              )
            )}
          </div>
          <div className="grid gap-2 border-t pt-5">
            <Label htmlFor="mission-files" className="flex items-center gap-1"><Paperclip className="size-3.5" /> Pièces jointes (JPEG, PNG, PDF, EML, MSG — 5 Mo max)</Label>
            <Input id="mission-files" type="file" accept={ATTACHMENT_ACCEPT} multiple onChange={(e) => handleFiles(e.target.files)} />
            {attachments.length > 0 && (
              <ul className="space-y-1 text-sm">
                {attachments.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded border bg-muted/30 px-2 py-1">
                    <a href={f.dataUrl} download={f.name} className="min-w-0 break-all underline">{f.name}</a>
                    <Button variant="ghost" size="icon" aria-label={`Retirer ${f.name}`} className="shrink-0" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1"><LinkIcon className="size-3.5" /> Lien (optionnel)</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} placeholder="https://…" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mission-notes">Notes / Consignes</Label>
            <Textarea id="mission-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={6} />
          </div>

            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="shrink-0 flex-wrap gap-3 border-t bg-background px-6 py-4 sm:justify-between sm:space-x-0">
          <div className="flex flex-wrap gap-2">
            {existing && (
              <Button variant="destructive" disabled={deleting} onClick={async () => {
                if (!confirm(existing.recurrence ? "Supprimer toute la série hebdomadaire et annuler ses invitations pour tous les techniciens assignés ?" : "Supprimer cette mission et annuler son invitation pour tous les techniciens assignés ?")) return;
                setDeleting(true);
                try {
                  await onDelete(existing.id);
                } catch (error) {
                  toast.error(`Mission conservée : ${error instanceof Error ? error.message : "annulation impossible"}`);
                } finally {
                  setDeleting(false);
                }
              }}>
                <Trash2 /> {deleting ? "Annulation…" : "Supprimer"}
              </Button>
            )}
            {(existing?.toConfirm || toConfirm) && (
              <Button
                disabled={deleting}
                onClick={() => {
                  if (!validateWeekly()) return;
                  if (teamsUrl.trim() && !normalizeTeamsUrl(teamsUrl)) {
                    toast.error("Saisissez un lien de réunion Microsoft Teams valide (https://…)");
                    return;
                  }
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
                  pushToCalendar(confirmed, selectedTechs, "RDV confirmé : détails envoyés dans l'agenda des techniciens", (meetUrl) => onSave({ ...confirmed, meetUrl }));
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
                {!weekly && <DropdownMenuItem asChild>
                  <a
                    href={outlookCalendarUrl(currentAssignment, selectedTechs, "work")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Outlook Web — créer l'ordre de mission
                  </a>
                </DropdownMenuItem>}
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
            <Button onClick={save} disabled={deleting}>Valider</Button>
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

function EditTechnicianDialog({
  open,
  onOpenChange,
  technician,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  technician: Tech;
  onSave: (name: string, email: string) => void;
}) {
  const [name, setName] = useState(technician.name);
  const [email, setEmail] = useState(technician.email);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le technicien</DialogTitle>
          <DialogDescription>
            Le nom et l'adresse e-mail sont utilisés pour l'envoi des ordres de mission.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Nom / Prénom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="grid gap-2">
            <Label>Adresse e-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            if (!name.trim() || !email.trim()) { toast.error("Nom et e-mail requis"); return; }
            onSave(name.trim(), email.trim());
          }}>Enregistrer</Button>
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

function shiftISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
