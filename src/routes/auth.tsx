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
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/planning", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && !timer) {
        setIntro(true);
        timer = setTimeout(() => navigate({ to: "/planning", replace: true }), 1800);
      }
    });
    return () => { data.subscription.unsubscribe(); if (timer) clearTimeout(timer); };
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
    <div className="cmc-theme cmc-auth relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 text-foreground">
      <div aria-hidden className="cmc-stripes cmc-stripes-tl"><span /><span /><span /></div>
      <div aria-hidden className="cmc-stripes cmc-stripes-br"><span /><span /><span /></div>
      {intro && (
        <div className="cmc-intro fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background" aria-live="polite">
          <img src={logoAsset.url} alt="Cinemeccanica France" className="cmc-intro-logo h-auto w-[360px] max-w-[80vw] object-contain" />
          <div className="cmc-intro-line h-px w-48 bg-primary" />
          <span className="sr-only">Ouverture du planning…</span>
        </div>
      )}
      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div className="space-y-6 border-b border-primary/50 pb-6 text-center">
          <div className="cmc-welcome relative mx-auto rounded-md w-[300px] max-w-full overflow-hidden">
            <img src={logoAsset.url} alt="Cinemeccanica France" width={1010} height={320} className="cmc-welcome-logo h-auto w-full object-contain" />
          </div>
          <div aria-hidden className="pointer-events-none relative mx-auto h-0 w-[300px] max-w-full">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <span key={i} className="cmc-spark absolute" style={{ left: `${8 + i * 12}%`, top: `${-90 + ((i * 37) % 70)}px`, animationDelay: `${1.2 + i * 0.12}s` }} />
            ))}
          </div>
          <div aria-hidden className="cmc-welcome-line mx-auto mt-3 h-px w-40 bg-primary" />
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
