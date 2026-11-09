import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { analyzePlanningAnomalies, type AnomalyReport } from "@/lib/planning-anomalies.functions";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function PlanningAnomaliesDialog({ open, onOpenChange, light }: { open: boolean; onOpenChange: (open: boolean) => void; light: boolean }) {
  const analyze = useServerFn(analyzePlanningAnomalies);
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setError(null); setReport(null);
    try { setReport(await analyze({ data: { from, to } })); }
    catch (e) { setError(e instanceof Error ? e.message : "Analyse indisponible"); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={`${light ? "cmc-theme-light" : "cmc-theme"} max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto tracking-normal`}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 tracking-normal"><Sparkles className="h-5 w-5 text-primary" /> Changements inhabituels</DialogTitle>
        <DialogDescription>Analyse par IA de l’historique des missions et des destinataires du planning.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Du<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" /></label>
        <label className="text-sm">Au<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" /></label>
        <Button onClick={run} disabled={busy || !from || !to || from > to}>{busy ? "Analyse en cours…" : "Analyser"}</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {report && <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{report.changeCount} modification(s) analysée(s){report.truncated ? " (les 400 premières seulement)" : ""}. Destinataires : liste actuelle uniquement.</p>
        <div className="whitespace-pre-wrap rounded-md border border-border p-3 text-sm">{report.text}</div>
      </div>}
    </DialogContent>
  </Dialog>;
}
