import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Trainings = { barco1?: boolean; barco2?: boolean; christie?: boolean; dolby?: boolean };
type Item = { name: string; sn: string };

const TRAININGS: Array<[keyof Trainings, string]> = [
  ["barco1", "Barco niveau 1"],
  ["barco2", "Barco niveau 2"],
  ["christie", "Christie"],
  ["dolby", "Dolby"],
];

/** Fiche technicien réservée aux super utilisateurs. */
export function TechnicianProfileDialog({ technicianId, name, light }: { technicianId: string; name: string; light: boolean }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [lastCt, setLastCt] = useState("");
  const [trainings, setTrainings] = useState<Trainings>({});
  const [equipment, setEquipment] = useState<Item[]>([]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data, error } = await supabase.from("technician_profiles").select("*").eq("technician_id", technicianId).maybeSingle();
      if (error) return toast.error(error.message);
      setPhone(data?.phone ?? "");
      setVehicle(data?.vehicle ?? "");
      setPlate(data?.plate ?? "");
      setLastCt(data?.last_ct ?? "");
      setTrainings((data?.trainings as Trainings) ?? {});
      setEquipment(Array.isArray(data?.equipment) ? (data.equipment as Item[]) : []);
    })();
  }, [open, technicianId]);

  const save = async () => {
    const { error } = await supabase.from("technician_profiles").upsert({
      technician_id: technicianId,
      phone: phone.trim() || null,
      vehicle: vehicle.trim() || null,
      plate: plate.trim().toUpperCase() || null,
      last_ct: lastCt || null,
      trainings: trainings as unknown as Json,
      equipment: equipment.filter((e) => e.name.trim() || e.sn.trim()) as unknown as Json,
      updated_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Fiche enregistrée");
    setOpen(false);
  };

  const setItem = (i: number, patch: Partial<Item>) =>
    setEquipment((l) => l.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <>
      <button type="button" className="font-medium underline-offset-2 hover:underline text-left" onClick={() => setOpen(true)}>
        {name}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`max-w-lg ${light ? "cmc-theme-light" : "cmc-theme"}`}>
          <DialogHeader>
            <DialogTitle>Fiche de {name}</DialogTitle>
            <DialogDescription>Visible uniquement par les super utilisateurs.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-3">
                <Label>Véhicule</Label>
                <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Marque et modèle" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Immatriculation</Label>
                <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="AB-123-CD" />
              </div>
              <div className="space-y-1">
                <Label>Dernier CT</Label>
                <Input type="date" value={lastCt} onChange={(e) => setLastCt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Formations</Label>
              <div className="grid grid-cols-2 gap-2">
                {TRAININGS.map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!trainings[k]} onCheckedChange={(v) => setTrainings((t) => ({ ...t, [k]: v === true }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Matériel</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setEquipment((l) => [...l, { name: "", sn: "" }])}>
                  <Plus /> Ajouter
                </Button>
              </div>
              {equipment.length === 0 && <p className="text-xs text-muted-foreground">Aucun matériel.</p>}
              {equipment.map((e, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={e.name} onChange={(ev) => setItem(i, { name: ev.target.value })} placeholder="Matériel" />
                  <Input value={e.sn} onChange={(ev) => setItem(i, { sn: ev.target.value })} placeholder="N° de série" className="w-40" />
                  <Button type="button" variant="ghost" size="icon" aria-label="Retirer" onClick={() => setEquipment((l) => l.filter((_, j) => j !== i))}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => void save()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
