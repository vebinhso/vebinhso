// Server functions for friend-house map & visiting.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HousePrivacy = "public" | "friends" | "custom" | "private" | "closed";

export type FriendHouse = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  map_x: number;
  map_y: number;
  house_privacy: HousePrivacy;
  house_name: string | null;
  is_online: boolean;
  in_house_owner: string | null;
};

export type HouseSearchResult = Pick<FriendHouse, "user_id" | "username" | "display_name" | "avatar_url" | "house_privacy" | "house_name">;

export const searchHouseAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({ query: String(input.query ?? "").trim().slice(0, 40) }))
  .handler(async ({ data, context }): Promise<HouseSearchResult[]> => {
    if (data.query.length < 2) return [];
    const pattern = `%${data.query}%`;
    const columns = "user_id, username, display_name, avatar_url, house_privacy, house_name";
    const [byUsername, byDisplayName] = await Promise.all([
      (context.supabase.from("profiles") as any).select(columns).ilike("username", pattern).limit(12),
      (context.supabase.from("profiles") as any).select(columns).ilike("display_name", pattern).limit(12),
    ]);
    if (byUsername.error) throw new Error(byUsername.error.message);
    if (byDisplayName.error) throw new Error(byDisplayName.error.message);
    const unique = new Map<string, HouseSearchResult>();
    for (const row of [...(byUsername.data ?? []), ...(byDisplayName.data ?? [])]) {
      if (row.user_id !== context.userId) unique.set(row.user_id, row as HouseSearchResult);
    }
    return Array.from(unique.values()).slice(0, 12);
  });

export const listFriendHouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_friend_houses");
    if (error) throw new Error(error.message);
    return (data ?? []) as FriendHouse[];
  });

export type MyHouseSettings = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  map_x: number;
  map_y: number;
  house_privacy: HousePrivacy;
  house_name: string | null;
  house_allow_list: string[];
  coop_build: boolean;
};

export const getMyHouseSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase.from("profiles") as any)
      .select("user_id, username, display_name, avatar_url, map_x, map_y, house_privacy, house_name, house_allow_list, coop_build")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as MyHouseSettings | null;
  });

// Returns accepted friends for whitelist checklist.
export const listMyFriendsForWhitelist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_friend_houses");
    if (error) throw new Error(error.message);
    return ((data ?? []) as FriendHouse[]).map((f) => ({
      user_id: f.user_id,
      username: f.username,
      display_name: f.display_name,
      avatar_url: f.avatar_url,
    }));
  });

export const updateHouseSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    privacy?: HousePrivacy;
    house_name?: string | null;
    map_x?: number;
    map_y?: number;
    house_allow_list?: string[];
    coop_build?: boolean;
  }) => {
    const out: Record<string, unknown> = {};
    if (input.privacy && ["public", "friends", "custom", "private", "closed"].includes(input.privacy)) {
      out.house_privacy = input.privacy;
    }
    if (input.house_name !== undefined) {
      out.house_name = input.house_name === null ? null : String(input.house_name).slice(0, 40);
    }
    if (typeof input.map_x === "number") out.map_x = Math.max(40, Math.min(1960, input.map_x));
    if (typeof input.map_y === "number") out.map_y = Math.max(40, Math.min(1160, input.map_y));
    if (Array.isArray(input.house_allow_list)) {
      out.house_allow_list = input.house_allow_list
        .filter((s) => typeof s === "string")
        .slice(0, 200);
    }
    if (typeof input.coop_build === "boolean") out.coop_build = input.coop_build;
    return out;
  })
  .handler(async ({ data, context }) => {
    if (Object.keys(data).length === 0) return { ok: true };
    const { error } = await (context.supabase.from("profiles") as any)
      .update(data)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const setPresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { online?: boolean; in_house_owner?: string | null }) => ({
    online: typeof input.online === "boolean" ? input.online : undefined,
    in_house_owner:
      input.in_house_owner === undefined
        ? undefined
        : input.in_house_owner === null
        ? null
        : String(input.in_house_owner),
  }))
  .handler(async ({ data, context }) => {
    const row: Record<string, unknown> = {
      user_id: context.userId,
      last_seen: new Date().toISOString(),
    };
    if (data.online !== undefined) row.is_online = data.online;
    if (data.in_house_owner !== undefined) row.in_house_owner = data.in_house_owner;
    const { error } = await (context.supabase.from("presence") as any)
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export type HouseSnapshot = {
  owner: {
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    house_name: string | null;
    house_privacy: HousePrivacy;
    coop_build: boolean;
  };
  placed: Array<{
    id: string; itemId: string; x: number; z: number; rotation: number;
    floor: number; angleRad?: number; stackY?: number;
  }>;
  walls: Array<{ id: string; ax: number; az: number; bx: number; bz: number; color: string; value: number; floor: number }>;
  roofs: Array<{ id: string; ax: number; az: number; bx: number; bz: number; style: "tile" | "ton"; value: number; floor: number }>;
  floors: Array<{ id: string; ax: number; az: number; bx: number; bz: number; value: number; floor: number }>;
  outfit: {
    skin: string; hair: string; shirt: string; pants: string; shoes: string; accent: string; hat?: string;
  } | null;
};

export const getVisitableHouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ownerId: string }) => {
    if (!input.ownerId || typeof input.ownerId !== "string") throw new Error("ownerId required");
    return { ownerId: input.ownerId };
  })
  .handler(async ({ data, context }): Promise<HouseSnapshot> => {
    const { supabase } = context;
    const { data: canVisit, error: cvErr } = await supabase.rpc("can_visit_house", {
      owner: data.ownerId,
    });
    if (cvErr) throw new Error(cvErr.message);
    if (!canVisit) throw new Error("Căn nhà này hiện không mở cho bạn tham quan.");

    const [prof, items, walls, roofs, floors, outfit] = await Promise.all([
      (supabase.from("profiles") as any)
        .select("user_id, username, display_name, avatar_url, house_name, house_privacy, coop_build")
        .eq("user_id", data.ownerId).maybeSingle(),
      supabase.from("placed_items").select("*").eq("user_id", data.ownerId),
      supabase.from("walls").select("*").eq("user_id", data.ownerId),
      supabase.from("roofs").select("*").eq("user_id", data.ownerId),
      (supabase.from as unknown as (t: string) => any)("floors").select("*").eq("user_id", data.ownerId),
      (supabase.from as unknown as (t: string) => any)("character_outfit").select("*").eq("user_id", data.ownerId).maybeSingle(),
    ]);
    if (prof.error) throw new Error(prof.error.message);
    if (!prof.data) throw new Error("Không tìm thấy chủ nhà.");

    return {
      owner: prof.data as HouseSnapshot["owner"],
      placed: (items.data ?? []).map((r: any) => ({
        id: r.id, itemId: r.item_id, x: r.x, z: r.z, rotation: r.rotation, floor: r.floor ?? 0,
        ...(r.angle_rad != null ? { angleRad: r.angle_rad } : {}),
        ...(r.stack_y != null ? { stackY: r.stack_y } : {}),
      })),
      walls: (walls.data ?? []).map((r: any) => ({
        id: r.id, ax: r.ax, az: r.az, bx: r.bx, bz: r.bz, color: r.color, value: r.value, floor: r.floor ?? 0,
      })),
      roofs: (roofs.data ?? []).map((r: any) => ({
        id: r.id, ax: r.ax, az: r.az, bx: r.bx, bz: r.bz, style: r.style, value: r.value, floor: r.floor ?? 0,
      })),
      floors: (floors.data ?? []).map((r: any) => ({
        id: r.id, ax: Number(r.ax), az: Number(r.az), bx: Number(r.bx), bz: Number(r.bz), value: r.value, floor: r.floor ?? 0,
      })),
      outfit: outfit?.data ? (outfit.data.outfit ?? null) : null,
    };
  });

// Look up a username by user_id (for toast "X đang tham quan").
export const getUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: String(input.userId) }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as { username: string; display_name: string | null; avatar_url: string | null } | null;
  });
