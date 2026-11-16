import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkSessionLifetime } from "@/lib/session-lifetime.browser";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { allowed } = await checkSessionLifetime();
    if (!allowed) throw redirect({ to: "/auth" });
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
