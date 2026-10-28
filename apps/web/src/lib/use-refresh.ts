import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

/**
 * After the active organization (or membership) changes, re-run route
 * loaders (session in context) and refetch oRPC queries.
 */
export function useRefreshAfterOrgChange() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    await router.invalidate();
    await queryClient.invalidateQueries();
  };
}
