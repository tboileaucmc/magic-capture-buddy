import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const searchCinemaAddresses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(3).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const { searchPhotonCinemas } = await import("./cinema-address.server");
    return searchPhotonCinemas(data.query);
  });