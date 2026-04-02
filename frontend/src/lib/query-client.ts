import { QueryClient } from '@tanstack/react-query';

/**
 * 목록 쿼리 기본 동작: 잠시 후면 "오래됨"으로 보고 refetch, 창 포커스/재연결 시 갱신.
 * mutation 은 실패 시 불필요한 재시도를 막기 위해 retry: false.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false;
          if (
            error &&
            typeof error === 'object' &&
            'status' in error &&
            typeof (error as { status?: number }).status === 'number'
          ) {
            const s = (error as { status: number }).status;
            if (s >= 400 && s < 500) return false;
          }
          return true;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
