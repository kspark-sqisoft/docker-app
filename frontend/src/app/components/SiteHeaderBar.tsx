import { Link } from 'react-router-dom';
import { Loader2, LogIn, LogOut, MessageSquareText, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store/auth-store';

const pill =
  'border-border rounded-md border bg-muted/40 px-1.5 py-px text-[0.65rem] font-medium leading-tight text-muted-foreground sm:px-2 sm:py-0.5 sm:text-xs';

/** Vite 프록시 기본과 동일(로컬 단독 백엔드 안내용). */
const defaultApiTarget = 'http://localhost:3000';

function HeaderStackBadges() {
  const isDev = import.meta.env.DEV;
  const modeLabel = isDev ? 'Dev' : 'Prod';
  const stackTitle = isDev
    ? `Vite 개발 서버 · /api → ${defaultApiTarget} (프록시)`
    : '프로덕션 빌드 · API는 배포 환경 기준';

  return (
    <div
      className="flex max-w-full shrink-0 flex-wrap items-center gap-1"
      title={stackTitle}
    >
      <span
        className={
          isDev
            ? 'rounded-md border border-amber-500/45 bg-amber-500/12 px-1.5 py-px text-[0.65rem] font-semibold uppercase tracking-wide text-amber-950 dark:text-amber-100 sm:px-2 sm:py-0.5 sm:text-xs'
            : 'rounded-md border border-emerald-600/35 bg-emerald-600/10 px-1.5 py-px text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-950 dark:text-emerald-100 sm:px-2 sm:py-0.5 sm:text-xs'
        }
      >
        {modeLabel}
      </span>
      <span className={pill}>NestJS</span>
      <span className={`${pill} hidden sm:inline`}>REST API</span>
      {isDev ? (
        <span className={`${pill} hidden md:inline`} title={stackTitle}>
          :3000
        </span>
      ) : null}
    </div>
  );
}

/** 상단 툴바 한 줄 — 브랜드(좌) · 인증(우). 모바일은 터치 영역·줄바꿈 최소화 */
export function SiteHeaderBar() {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link
          to="/posts"
          className="text-primary flex min-w-0 max-w-[min(100%,12rem)] items-center gap-1.5 rounded-md py-1 pr-1 transition-opacity hover:opacity-90 sm:max-w-none sm:gap-2"
        >
          <MessageSquareText
            className="size-6 shrink-0 sm:size-7"
            aria-hidden
          />
          <span className="font-heading truncate text-base font-semibold tracking-tight sm:text-lg">
            Notice Board
          </span>
        </Link>
        <HeaderStackBadges />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
        {!ready ? (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs sm:text-sm">
            <Loader2 className="size-3.5 animate-spin sm:size-4" aria-hidden />
            <span className="max-w-20 truncate sm:max-w-none">확인 중…</span>
          </div>
        ) : user ? (
          <>
            <Link
              to="/profile"
              className="hover:bg-accent/60 flex max-w-[min(11rem,48vw)] items-center gap-2 rounded-lg border border-transparent p-0.5 transition-colors hover:border-border sm:max-w-56 sm:p-1"
              aria-label={`프로필 (${user.name})`}
              title={user.email}
            >
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="border-border size-8 shrink-0 rounded-full border object-cover sm:size-9"
                />
              ) : (
                <div
                  className="bg-primary/15 text-primary border-border flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium sm:size-9 sm:text-sm"
                  aria-hidden
                >
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-medium sm:text-sm">
                  {user.name}
                </p>
                <p className="text-muted-foreground hidden truncate text-[0.65rem] sm:block sm:text-xs">
                  {user.email}
                </p>
              </div>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-0 px-2 sm:h-8 sm:gap-1.5 sm:px-2.5"
              onClick={() => void logout()}
              title="로그아웃"
            >
              <LogOut className="size-3.5 sm:size-4" aria-hidden />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2 text-xs sm:h-8 sm:gap-1.5 sm:px-2.5 sm:text-sm"
              asChild
            >
              <Link to="/login" aria-label="로그인">
                <LogIn className="size-3.5 sm:size-4" aria-hidden />
                <span className="hidden min-[360px]:inline">로그인</span>
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 px-2 text-xs sm:h-8 sm:gap-1.5 sm:px-2.5 sm:text-sm"
              asChild
            >
              <Link to="/register" aria-label="회원가입">
                <UserPlus className="size-3.5 sm:size-4" aria-hidden />
                <span className="hidden min-[360px]:inline">가입</span>
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
