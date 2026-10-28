import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import logoAsset from "@/assets/logo-cmc.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Planning Cinemeccanica" },
      { name: "description", content: "Connectez-vous pour accéder au planning des techniciens Cinemeccanica." },
      { property: "og:title", content: "Connexion — Planning Cinemeccanica" },
      { property: "og:description", content: "Connectez-vous pour accéder au planning des techniciens Cinemeccanica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/planning", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/planning", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Compte créé : cliquez sur le lien reçu par e-mail pour l'activer.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cmc-theme cmc-auth flex min-h-screen items-center justify-center px-6 py-12 text-foreground">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-6 border-b border-primary/50 pb-6 text-center">
          <img src={logoAsset.url} alt="Cinemeccanica France" width={1010} height={320} className="mx-auto h-auto w-[300px] max-w-full object-contain" />
          <h1 className="text-2xl font-bold">Planning Techniciens</h1>
          <p className="text-sm text-muted-foreground">{mode === "login" ? "Connectez-vous pour accéder au planning." : "Créez votre compte."}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="pw">Mot de passe</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{mode === "login" ? "Se connecter" : "Créer le compte"}</Button>
        </form>
        <Button type="button" variant="link" className="h-auto w-full whitespace-normal text-center text-sm text-muted-foreground"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
        </Button>
      </div>
      <Toaster />
    </div>
  );
}
