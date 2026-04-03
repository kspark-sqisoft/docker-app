import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Inbox, Loader2, PenSquare } from 'lucide-react';
import { fetchPostList, postsKeys } from '@/api/posts';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type PostListProps = {
  extraBannerError?: string | null;
};

export function PostList({ extraBannerError = null }: PostListProps) {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);

  const {
    data: posts = [],
    isPending: listLoading,
    isError: listIsError,
    error: listErrorRaw,
    isFetching: listFetching,
  } = useQuery({
    queryKey: postsKeys.list(),
    queryFn: fetchPostList,
  });

  const listErrorMessage = listIsError
    ? listErrorRaw instanceof Error
      ? listErrorRaw.message
      : '오류'
    : null;

  const bannerError = listErrorMessage ?? extraBannerError ?? null;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-lg font-medium">글 목록</h2>
        <div className="flex flex-wrap items-center gap-2">
          {ready && user ? (
            <Button size="sm" className="gap-1.5" asChild>
              <Link to="/posts/new">
                <PenSquare className="size-3.5" aria-hidden />
                글 작성
              </Link>
            </Button>
          ) : ready ? (
            <Button size="sm" variant="outline" asChild>
              <Link to="/login" state={{ from: '/posts/new' }}>
                로그인 후 글 작성
              </Link>
            </Button>
          ) : null}
          {!listLoading && (
            <div className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
              <span>{posts.length}건</span>
              {listFetching ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  동기화
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {bannerError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>문제가 발생했습니다</AlertTitle>
          <AlertDescription>{bannerError}</AlertDescription>
        </Alert>
      ) : null}

      {listLoading ? (
        <div className="space-y-3">
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-1/4" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/3" />
            </CardHeader>
          </Card>
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center text-sm">
            <Inbox
              className="text-muted-foreground/40 size-10"
              aria-hidden
            />
            <p>아직 글이 없습니다. 글 작성으로 첫 글을 남겨 보세요.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2 sm:gap-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link to={`/posts/${p.id}`} className="block">
                <Card className="transition-colors hover:bg-accent/40">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base leading-snug">
                      {p.title}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-x-2 text-xs">
                      <span>
                        {new Date(p.createdAt).toLocaleString('ko-KR')}
                      </span>
                      {p.authorName ? (
                        <span>· {p.authorName}</span>
                      ) : (
                        <span>· 익명</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
