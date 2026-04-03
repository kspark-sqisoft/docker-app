import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { deletePost, fetchPost, postsKeys } from '@/api/posts';
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

type FetchErr = Error & { status?: number };

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const {
    data: post,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: postsKeys.detail(postId ?? ''),
    queryFn: () => fetchPost(postId!),
    enabled: !!postId,
  });

  const del = useMutation({
    mutationFn: () => {
      if (!accessToken || !postId) throw new Error('로그인이 필요합니다.');
      return deletePost(accessToken, postId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: postsKeys.list() });
      navigate('/posts', { replace: true });
    },
  });

  if (!postId) {
    return <Navigate to="/posts" replace />;
  }

  const err = error as FetchErr | null;
  if (isError && err?.status === 404) {
    return <Navigate to="/posts" replace />;
  }

  const isOwner =
    !!user && !!post?.authorId && user.id === post.authorId;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1 px-0" asChild>
        <Link to="/posts">← 목록</Link>
      </Button>

      {isError && err?.status !== 404 ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>불러오기 실패</AlertTitle>
          <AlertDescription>
            {err?.message ?? '글을 불러오지 못했습니다.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div className="text-muted-foreground flex items-center gap-2 py-12 text-sm">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          불러오는 중…
        </div>
      ) : post ? (
        <Card>
          <CardHeader className="space-y-3 border-b pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="text-xl leading-snug sm:text-2xl">
                  {post.title}
                </CardTitle>
                <CardDescription>
                  {new Date(post.createdAt).toLocaleString('ko-KR')}
                  {post.authorName ? ` · ${post.authorName}` : ' · 익명'}
                  {post.updatedAt !== post.createdAt ? (
                    <span className="block text-[0.7rem] sm:inline sm:before:content-['·']">
                      {' '}
                      수정{' '}
                      {new Date(post.updatedAt).toLocaleString('ko-KR')}
                    </span>
                  ) : null}
                </CardDescription>
              </div>
              {isOwner && accessToken ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <Link to={`/posts/${post.id}/edit`}>
                      <Pencil className="size-3.5" aria-hidden />
                      수정
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    disabled={del.isPending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          '이 글을 삭제할까요? 되돌릴 수 없습니다.',
                        )
                      ) {
                        return;
                      }
                      void del.mutate();
                    }}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    {del.isPending ? '삭제 중…' : '삭제'}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <p className="text-card-foreground whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
              {post.content}
            </p>
            {post.imageUrls && post.imageUrls.length > 0 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">
                  첨부 이미지
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {post.imageUrls.map((src) => (
                    <li
                      key={src}
                      className="overflow-hidden rounded-lg ring-1 ring-border"
                    >
                      <div className="bg-muted/30">
                        <img
                          src={src}
                          alt=""
                          className="max-h-96 w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {del.isError ? (
        <Alert variant="destructive">
          <AlertTitle>삭제 실패</AlertTitle>
          <AlertDescription>
            {del.error instanceof Error
              ? del.error.message
              : '삭제에 실패했습니다.'}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
