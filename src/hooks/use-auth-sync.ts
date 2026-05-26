import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hydrateFromSession, setCurrentUserCache } from "@/lib/auth";
import { resetGameCacheForLogout } from "@/lib/game";

/** Wires Supabase auth state to the app: hydrates cache and invalidates router/query caches. */
export function useAuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen first to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentUserCache(null);
        resetGameCacheForLogout();
      } else {
        // Defer to avoid Supabase recursion warnings
        setTimeout(() => { hydrateFromSession().catch(() => {}); }, 0);
      }
      router.invalidate();
      queryClient.invalidateQueries();
    });
    // Initial hydrate
    hydrateFromSession().catch(() => {});
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
}
