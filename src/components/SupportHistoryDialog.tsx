import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Row = {
  id: string;
  created_at: string;
  user_email: string | null;
  action: string;
  title: string | null;
  technicians: string | null;
  date_iso: string | null;
};

/** Super utilisateur : historique des missions de l'équipe support. */
export function SupportHistoryDialog({ open: controlledOpen, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data, error } = await supabase
      .from("mission_history")
      .select("id, created_at, user_email, action, title, technicians, date_iso")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  return (
    <>
      {controlledOpen === undefined && <Button variant="outline" onClick={() => setOpen(true)}>
        <History /> Historique support
      </Button>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historique des missions support</DialogTitle>
            <DialogDescription>Créations, modifications et suppressions des missions de François, Hugo, Nabil et Amaury.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">Aucun changement enregistré pour l'instant.</p>}
            {rows.map((r) => (
              <div key={r.id} className="rounded border p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold capitalize">{r.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · {r.user_email ?? "système"}
                  </span>
                </div>
                <div>{r.title || "(sans intitulé)"}</div>
                <div className="text-xs text-muted-foreground">
                  {r.technicians}
                  {r.date_iso && ` · ${new Date(r.date_iso).toLocaleDateString("fr-FR")}`}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
