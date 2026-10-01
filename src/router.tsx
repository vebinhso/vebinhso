import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import RouteLoading from "./components/RouteLoading";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 150,
    defaultPendingMinMs: 0,
    defaultPendingComponent: RouteLoading,
  });

  return router;
};
