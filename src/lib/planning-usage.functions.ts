import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanningUsage } from "./planning-usage";

export const getPlanningUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanningUsage> => {
    const { data, error } = await context.supabase.rpc("admin_planning_usage");
    if (error) throw new Error(error.message);
    return data as unknown as PlanningUsage;
  });