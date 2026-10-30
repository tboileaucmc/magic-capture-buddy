import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import logoAsset from "@/assets/logo-cmc.png.asset.json";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Planning Cinemeccanica" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour le planning Cinemeccanica." },
      { property: "og:title", content: "Nouveau mot de passe — Planning Cinemeccanica" },
      { property: "og:description", content: "Choisissez un nouveau mot de passe pour le planning Cinemeccanica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { toast.error("Les deux mots de passe ne correspondent pas."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe modifié.");
    setTimeout(() => navigate({ to: "/planning", replace: true }), 800);
  };

  return (
    <div className="cmc-theme cmc-auth flex min-h-screen items-center justify-center px-6 py-12 text-foreground">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-4 border-b border-primary/50 pb-6 text-center">
          <img src={logoAsset.url} alt="Cinemeccanica France" width={1010} height={320} className="mx-auto h-auto w-[260px] max-w-full object-contain" />
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground">Choisissez votre nouveau mot de passe.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label htmlFor="pw">Nouveau mot de passe</Label>
            <Input id="pw" type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="pw2">Confirmer</Label>
            <Input id="pw2" type="password" required minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>Enregistrer</Button>
        </form>
      </div>
      <Toaster />
    </div>
  );
}
