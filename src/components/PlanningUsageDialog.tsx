import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPlanningUsage } from "@/lib/planning-usage.functions";
import { formatBytes, usageChange, type PlanningUsage } from "@/lib/planning-usage";

export function PlanningUsageDialog({ open, onOpenChange, light }: { open: boolean; onOpenChange: (open: boolean) => void; light: boolean }) {
  const fetchUsage = useServerFn(getPlanningUsage);
  const [usage, setUsage] = useState<PlanningUsage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setBusy(true);
    setError(null);
    try { setUsage(await fetchUsage()); }
    catch (e) { setError(e instanceof Error ? e.message : "Mesures indisponibles"); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!open) return;
    let active = true;
    setBusy(true);
    setError(null);
    fetchUsage().then((result) => { if (active) setUsage(result); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Mesures indisponibles"); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [open, fetchUsage]);
  const current = usage?.current;
  const previous = usage?.history.filter((s) => s.day < (current?.day ?? "")).at(-1);
  const change = current ? usageChange(current, previous) : null;
  const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("fr-FR")}`;

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={`${light ? "cmc-theme-light" : "cmc-theme"} max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto tracking-normal`}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 tracking-normal"><Database className="h-5 w-5 text-primary" /> Données et missions</DialogTitle>
        <DialogDescription>Planning Cinemeccanica · Suivi réservé aux super utilisateurs</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <span className="text-xs text-muted-foreground">{current ? `Dernier relevé : ${new Date(current.measured_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Paris)` : "Aucun relevé chargé"}</span>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}><RefreshCw className={busy ? "animate-spin" : ""} /> Actualiser</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {busy && !current && <p role="status" className="text-sm text-muted-foreground">Chargement des mesures…</p>}
      {current && <>
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div><dt className="text-sm text-muted-foreground">Missions enregistrées</dt><dd className="mt-1 text-3xl font-semibold text-primary">{current.mission_count.toLocaleString("fr-FR")}</dd><dd className="mt-1 text-xs text-muted-foreground">{current.recurring_count} séries hebdomadaires · {current.exception_count} exceptions</dd></div>
          <div><dt className="text-sm text-muted-foreground">Contenu du planning</dt><dd className="mt-1 text-3xl font-semibold">{formatBytes(current.planning_json_bytes)}</dd><dd className="mt-1 text-xs text-muted-foreground">Missions, techniciens et catégories</dd></div>
          <div><dt className="text-sm text-muted-foreground">Évolution depuis le relevé précédent</dt><dd className="mt-1 text-xl font-semibold">{change ? `${signed(change.missions)} missions` : "Premier relevé"}</dd><dd className="mt-1 text-xs text-muted-foreground">{change ? `${change.planningBytes > 0 ? "+" : ""}${formatBytes(change.planningBytes)} de contenu` : "Historique disponible à partir d’aujourd’hui"}</dd></div>
        </dl>
        <section className="border-t pt-4">
          <h3 className="mb-3 font-semibold">Volumes distincts</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt>Table du planning, index et espace réservé</dt><dd className="shrink-0 tabular-nums">{formatBytes(current.planning_table_bytes)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Historique des missions support, index inclus</dt><dd className="shrink-0 tabular-nums">{formatBytes(current.history_table_bytes)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Base complète, toutes tables comprises</dt><dd className="shrink-0 tabular-nums">{formatBytes(current.database_bytes)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Ces volumes ne s’additionnent pas : le contenu appartient à la table du planning, elle-même incluse dans la base complète.</p>
          <p className="mt-2 border-l-2 border-primary pl-3 text-sm">Disque serveur : occupation et capacité non mesurées ici. Les fichiers internes du serveur et les pièces jointes Google Drive ne sont pas comptabilisés dans le contenu du planning. Aucune alerte de saturation n’est calculée.</p>
        </section>
        <section className="border-t pt-4">
          <h3 className="mb-2 font-semibold">Évolution quotidienne · 90 derniers relevés</h3>
          <div className="max-h-60 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-muted-foreground"><tr><th className="p-2 font-medium">Date</th><th className="p-2 text-right font-medium">Missions</th><th className="p-2 text-right font-medium">Contenu</th><th className="p-2 text-right font-medium">Base complète</th></tr></thead>
              <tbody>{[...usage.history].reverse().map((row) => <tr key={row.day} className="border-b"><td className="p-2 whitespace-nowrap">{row.day.split("-").reverse().join("/")}</td><td className="p-2 text-right tabular-nums">{row.mission_count}</td><td className="p-2 text-right whitespace-nowrap tabular-nums">{formatBytes(row.planning_json_bytes)}</td><td className="p-2 text-right whitespace-nowrap tabular-nums">{formatBytes(row.database_bytes)}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Dernier état de chaque journée où le planning change ou ce suivi est consulté ; une série compte une fois, sans multiplier ses réunions futures.</p>
        </section>
      </>}
    </DialogContent>
  </Dialog>;
}