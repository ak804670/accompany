import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60_000,
    },
  },
});

export async function syncResource<T>(queryKey: readonly unknown[], queryFn: () => Promise<T>, force = false): Promise<T> {
  if (force) await queryClient.invalidateQueries({ queryKey });
  return queryClient.fetchQuery({
    queryKey: [...queryKey],
    queryFn,
    staleTime: force ? 0 : 10_000,
  });
}
