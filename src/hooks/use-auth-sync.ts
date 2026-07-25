import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hydrateFromSession, setCurrentUserCache, getCurrentUser } from "@/lib/auth";
import { resetGameCacheForLogout } from "@/lib/game";
import { setPresence } from "@/lib/friend-houses.functions";

async function safeSetPresence(payload: { online?: boolean; in_house_owner?: string | null }) {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) return;
    await setPresence({ data: payload });
  } catch { /* ignore */ }
}

/** Wires Supabase auth state to the app: hydrates cache, invalidates caches, and maintains online presence. */
export function useAuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentUserCache(null);
        resetGameCacheForLogout();
      } else {
        setTimeout(() => {
          hydrateFromSession()
            .then(() => safeSetPresence({ online: true }))
            .catch(() => {});
        }, 0);
      }
      router.invalidate();
      queryClient.invalidateQueries();
    });
    // Initial hydrate
    hydrateFromSession()
      .then(() => { if (getCurrentUser()) safeSetPresence({ online: true }); })
      .catch(() => {});

    // Heartbeat every 60s so `last_seen` stays fresh & online resurfaces after tab sleep.
    const heartbeat = window.setInterval(() => {
      if (getCurrentUser()) safeSetPresence({ online: true });
    }, 60_000);

    // Mark offline on tab close / hide.
    const goOffline = () => { if (getCurrentUser()) safeSetPresence({ online: false }); };
    const onVis = () => { if (!getCurrentUser()) return; if (document.visibilityState === "hidden") goOffline(); else safeSetPresence({ online: true }); };
    window.addEventListener("beforeunload", goOffline);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      subscription.unsubscribe();
      window.clearInterval(heartbeat);
      window.removeEventListener("beforeunload", goOffline);
      document.removeEventListener("visibilitychange", onVis);
    };

  }, [router, queryClient]);
}

