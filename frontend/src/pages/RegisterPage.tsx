import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';

export function RegisterPage() {
  const navigate = useNavigate();
  const ready = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);

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
            이미 계정이 있으면{' '}
            <Link
              to="/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              로그인
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm
            onSuccess={() => navigate('/posts', { replace: true })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
