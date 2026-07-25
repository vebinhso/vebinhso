import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hydrateFromSession, setCurrentUserCache, getCurrentUser } from "@/lib/auth";
import { resetGameCacheForLogout } from "@/lib/game";
import { setPresence } from "@/lib/friend-houses.functions";

/** Wires Supabase auth state to the app: hydrates cache, invalidates caches, and maintains online presence. */
export function useAuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // Best-effort offline before we drop the session
        setPresence({ data: { online: false } }).catch(() => {});
        setCurrentUserCache(null);
        resetGameCacheForLogout();
      } else {
        setTimeout(() => {
          hydrateFromSession()
            .then(() => setPresence({ data: { online: true } }).catch(() => {}))
            .catch(() => {});
        }, 0);
      }
      router.invalidate();
      queryClient.invalidateQueries();
    });
    // Initial hydrate
    hydrateFromSession()
      .then(() => {
        if (getCurrentUser()) setPresence({ data: { online: true } }).catch(() => {});
      })
      .catch(() => {});

    // Heartbeat every 60s so `last_seen` stays fresh & online resurfaces after tab sleep.
    const heartbeat = window.setInterval(() => {
      if (getCurrentUser()) setPresence({ data: { online: true } }).catch(() => {});
    }, 60_000);

    // Mark offline on tab close / hide.
    const goOffline = () => { setPresence({ data: { online: false } }).catch(() => {}); };
    const onVis = () => { if (document.visibilityState === "hidden") goOffline(); else if (getCurrentUser()) setPresence({ data: { online: true } }).catch(() => {}); };
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
