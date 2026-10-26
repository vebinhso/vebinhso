import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { GardenSnapshot } from "./neighborhood";
import { gardenStatus } from "./garden-growth";

export const readGarden = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<GardenSnapshot> => {
  const { supabase, userId } = context;
  const [plants, inventory, state] = await Promise.all([
    supabase.from("garden_plants").select("*").order("planted_at").limit(300),
    supabase.from("garden_inventory").select("item_id,quantity").eq("user_id", userId),
    supabase.from("game_state").select("money").eq("user_id", userId).maybeSingle(),
  ]);
  if (plants.error || inventory.error || state.error) throw new Error("Cannot load garden");
  const ids = [...new Set((plants.data ?? []).map(p => p.owner_id))];
  const profiles = ids.length ? await supabase.from("profiles").select("user_id,username").in("user_id", ids) : { data: [] };
  const names = new Map((profiles.data ?? []).map(p => [p.user_id, p.username]));
  const now = Date.now();
  const vnDay = (t: number) => Math.floor((t + 7 * 3600000) / 86400000);
  return {
    plants: (plants.data ?? []).map(p => ({ ...p, owner_name: names.get(p.owner_id) ?? "", ...(() => { const s = gardenStatus({ plantedAt: p.planted_at, lastWateredAt: p.watered_at, now: new Date(now).toISOString(), boosted: !!p.boosted }); return { growth: s.effectiveDays, grow_days: 30, level: s.level, wilted: s.wilted, can_water_today: s.canWaterToday }; })() })),
    inventory: Object.fromEntries((inventory.data ?? []).map(i => [i.item_id, i.quantity])),
    money: state.data?.money ?? 0, server_time: new Date(now).toISOString(),
  };
});
export const buyGardenItem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ item: z.enum(["seed_rose", "seed_mango", "seed_sunflower", "seed_paper", "watering_use"]), amount: z.number().int().min(1).max(99) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("garden_purchase", data);
    if (result.error) throw new Error(result.error.message);
    return result.data as { money: number; garden_spent: number };
  });
export const plantGardenSeed = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ item: z.enum(["seed_rose", "seed_mango", "seed_sunflower", "seed_paper"]), cell: z.number().int().min(0).max(39) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("garden_plant", data);
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });
export const waterGardenPlant = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ plant: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("garden_water", data);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });
export const removeWiltedGardenPlant = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ plant: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("garden_remove_wilted", data);
    if (result.error) throw new Error(result.error.message);
    return result.data as { money: number; garden_spent: number };
  });
