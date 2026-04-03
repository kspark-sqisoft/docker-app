import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth-store';

type RequireAuthProps = {
  children: ReactNode;
};

/** 로그인 후에만 자식 라우트를 보여줍니다. */
export function RequireAuth({ children }: RequireAuthProps) {
  const ready = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!ready) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center gap-2 text-sm">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
        <span className="text-muted-foreground">세션 확인 중…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return children;
}
