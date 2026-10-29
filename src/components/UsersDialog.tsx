import { useState } from "react";
import { Trash2, Users } from "lucide-react";
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
    const { error } = await supabase.rpc("admin_set_role", { _target: id, _role: value });
    if (error) return toast.error(error.message);
    toast.success("Droits mis à jour");
    void load();
  };

  const remove = async (r: Row) => {
    if (!window.confirm(`Supprimer définitivement le compte ${r.email} ?`)) return;
    const { error } = await supabase.rpc("admin_delete_user", { _target: r.user_id });
    if (error) return toast.error(error.message);
    toast.success("Compte supprimé");
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
              Les nouveaux comptes sont en lecture seule. Passez-les en « Écriture » pour qu'ils puissent modifier le planning, ou en « Écriture support » pour ne gérer que les missions de François, Hugo, Nabil et Amaury.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.user_id} className="flex items-center justify-between gap-3 rounded border p-2 text-sm">
                <span className="truncate">{r.email}</span>
                {r.role === "admin" ? (
                  <span className="text-xs font-semibold text-muted-foreground">Super utilisateur</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select value={r.role} onValueChange={(v) => void change(r.user_id, v)}>
                      <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Lecture</SelectItem>
                        <SelectItem value="editor">Écriture</SelectItem>
                        <SelectItem value="support_editor">Écriture support</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" aria-label={`Supprimer ${r.email}`} onClick={() => void remove(r)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
