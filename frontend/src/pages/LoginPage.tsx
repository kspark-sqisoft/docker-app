import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const ready = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/posts';

  if (!ready) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          세션 확인 중…
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/posts" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardDescription>
            계정이 없으면{' '}
            <Link
              to="/register"
              className="text-primary underline-offset-4 hover:underline"
            >
              회원가입
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            onSuccess={() => navigate(redirectTo, { replace: true })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
