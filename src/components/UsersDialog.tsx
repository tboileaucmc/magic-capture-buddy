import { useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = { user_id: string; email: string; role: string };

/** Réservé au super utilisateur : donne ou retire les droits d'écriture. */
export function UsersDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Row[]);
  };

  const change = async (id: string, value: string) => {
    const { error } = await supabase.rpc("admin_set_editor", { _target: id, _can_edit: value === "editor" });
    if (error) return toast.error(error.message);
    toast.success("Droits mis à jour");
    void load();
  };

  return (
    <>
      <Button variant="outline" onClick={() => { setOpen(true); void load(); }}>
        <Users /> Utilisateurs
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Droits des utilisateurs</DialogTitle>
            <DialogDescription>
              Les nouveaux comptes sont en lecture seule. Passez-les en « Écriture » pour qu'ils puissent modifier le planning.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.user_id} className="flex items-center justify-between gap-3 rounded border p-2 text-sm">
                <span className="truncate">{r.email}</span>
                {r.role === "admin" ? (
                  <span className="text-xs font-semibold text-muted-foreground">Super utilisateur</span>
                ) : (
                  <Select value={r.role} onValueChange={(v) => void change(r.user_id, v)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Lecture</SelectItem>
                      <SelectItem value="editor">Écriture</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
