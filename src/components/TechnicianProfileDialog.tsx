import { useEffect, useState } from "react";
import { Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { threeCxCallUrl } from "@/lib/3cx";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Trainings = { barco1?: boolean; barco2?: boolean; christie?: boolean; dolby?: boolean; habElec?: boolean; cacesNacelle?: boolean };
type Item = { name: string; sn: string };

const TRAINING_GROUPS: Array<{ label: string; items: Array<[keyof Trainings, string]> }> = [
  { label: "Projecteur", items: [["barco1", "Barco niveau 1"], ["barco2", "Barco niveau 2"], ["christie", "Christie"]] },
  { label: "Son", items: [["dolby", "Dolby Atmos"]] },
  { label: "Autres", items: [["habElec", "Habilitation électrique"], ["cacesNacelle", "CACES Nacelle"]] },
];

/** Fiche technicien : modifiable par les super utilisateurs, consultable (avec appels) par les autres. */
export function TechnicianProfileDialog({ technicianId, name, light, readOnly = false }: { technicianId: string; name: string; light: boolean; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [ext3cx, setExt3cx] = useState("");
  const [btpCard, setBtpCard] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [lastCt, setLastCt] = useState("");
  const [fuelCard, setFuelCard] = useState("");
  const [trainings, setTrainings] = useState<Trainings>({});
  const [equipment, setEquipment] = useState<Item[]>([]);
  const extensionCallUrl = threeCxCallUrl(ext3cx);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data, error } = await supabase.from("technician_profiles").select("*").eq("technician_id", technicianId).maybeSingle();
      if (error) return toast.error(error.message);
      setPhone(data?.phone ?? "");
      setExt3cx(data?.extension_3cx ?? "");
      setBtpCard(data?.btp_card ?? "");
      setVehicle(data?.vehicle ?? "");
      setPlate(data?.plate ?? "");
      setLastCt(data?.last_ct ?? "");
      setFuelCard(data?.fuel_card ?? "");
      setTrainings((data?.trainings as Trainings) ?? {});
      setEquipment(Array.isArray(data?.equipment) ? (data.equipment as Item[]) : []);
    })();
  }, [open, technicianId]);

  const save = async () => {
    const { error } = await supabase.from("technician_profiles").upsert({
      technician_id: technicianId,
      phone: phone.trim() || null,
      extension_3cx: ext3cx.trim() || null,
      btp_card: btpCard.trim() || null,
      vehicle: vehicle.trim() || null,
      plate: plate.trim().toUpperCase() || null,
      last_ct: lastCt || null,
      fuel_card: fuelCard.trim() || null,
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
            <DialogDescription>{readOnly ? "Consultation seule — les boutons téléphone permettent d’appeler." : "Modifiable uniquement par les super utilisateurs."}</DialogDescription>
          </DialogHeader>
          <fieldset disabled={readOnly} className="contents"><div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-[1fr_10rem] gap-3">
              <div className="space-y-1">
                <Label>Téléphone</Label>
                <div className="flex gap-1">
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
                  {phone.trim() && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} aria-label={`Appeler ${phone}`} title="Appeler"><Phone /></a>
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Poste 3CX</Label>
                <div className="flex gap-1">
                  <Input inputMode="numeric" value={ext3cx} onChange={(e) => setExt3cx(e.target.value)} placeholder="101" />
                  {extensionCallUrl && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={extensionCallUrl} target="_blank" rel="noopener noreferrer" aria-label={`Appeler le poste ${ext3cx} dans 3CX en ligne`} title="Ouvrir le poste dans 3CX en ligne"><Phone /></a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="technician-btp-card">Numéro de carte BTP</Label>
              <Input id="technician-btp-card" value={btpCard} onChange={(e) => setBtpCard(e.target.value)} placeholder="Numéro de carte BTP" />
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
              <div className="space-y-1 sm:col-span-3">
                <Label>N° de carte GR</Label>
                <Input value={fuelCard} onChange={(e) => setFuelCard(e.target.value)} placeholder="Numéro de carte carburant" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Formations</Label>
              {TRAINING_GROUPS.map((g) => (
                <div key={g.label} className="rounded border p-2">
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{g.label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {g.items.map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={!!trainings[k]} onCheckedChange={(v) => setTrainings((t) => ({ ...t, [k]: v === true }))} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Matériel</Label>
                {!readOnly && <Button type="button" size="sm" variant="outline" onClick={() => setEquipment((l) => [...l, { name: "", sn: "" }])}>
                  <Plus /> Ajouter
                </Button>}
              </div>
              {equipment.length === 0 && <p className="text-xs text-muted-foreground">Aucun matériel.</p>}
              {equipment.map((e, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={e.name} onChange={(ev) => setItem(i, { name: ev.target.value })} placeholder="Matériel" />
                  <Input value={e.sn} onChange={(ev) => setItem(i, { sn: ev.target.value })} placeholder="N° de série" className="w-40" />
                  {!readOnly && <Button type="button" variant="ghost" size="icon" aria-label="Retirer" onClick={() => setEquipment((l) => l.filter((_, j) => j !== i))}>
                    <Trash2 className="text-destructive" />
                  </Button>}
                </div>
              ))}
            </div>
          </div></fieldset>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{readOnly ? "Fermer" : "Annuler"}</Button>
            {!readOnly && <Button onClick={() => void save()}>Enregistrer</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
