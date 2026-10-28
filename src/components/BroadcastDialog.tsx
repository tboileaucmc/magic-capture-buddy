import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Plus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const KEY = "planning-broadcast-list";

/** Liste de diffusion (mémorisée sur ce poste) + bouton d'envoi du planning PDF. */
export function BroadcastDialog({ onSend }: { onSend: (emails: string[]) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    try { setEmails(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { /* ignore */ }
  }, []);
  const persist = (list: string[]) => { setEmails(list); localStorage.setItem(KEY, JSON.stringify(list)); };

  const add = () => {
    const e = input.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error("Adresse e-mail invalide"); return; }
    if (emails.includes(e)) { toast.error("Adresse déjà dans la liste"); return; }
    persist([...emails, e]); setInput("");
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Mail /> Envoyer le planning</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer le planning</DialogTitle>
            <DialogDescription>Le planning des 2 semaines à venir part en PDF depuis planning.cinemeccanica@gmail.com.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input placeholder="adresse@exemple.fr" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
            <Button onClick={add} variant="outline"><Plus /> Ajouter</Button>
          </div>
          <ul className="max-h-60 space-y-1 overflow-auto">
            {emails.length === 0 && <li className="text-sm text-muted-foreground">Aucune adresse pour l'instant.</li>}
            {emails.map((e) => (
              <li key={e} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                {e}
                <button type="button" aria-label={`Retirer ${e}`} className="text-muted-foreground hover:text-destructive"
                  onClick={() => persist(emails.filter((x) => x !== e))}><X className="size-4" /></button>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button disabled={sending || emails.length === 0} onClick={async () => {
              setSending(true);
              try { await onSend(emails); setOpen(false); } finally { setSending(false); }
            }}>
              <Send /> {sending ? "Envoi…" : `Envoyer à ${emails.length} destinataire${emails.length > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
