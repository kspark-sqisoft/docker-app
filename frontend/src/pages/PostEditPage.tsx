import { useActionState, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { fetchPost, postsKeys, updatePost } from '@/api/posts';
import { parseCreatePostForm } from '@/schemas/post-forms';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type FetchErr = Error & { status?: number };

type FormState = {
  error: string | null;
  fieldErrors: { title?: string; content?: string } | null;
};

export function PostEditPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [defaults, setDefaults] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const {
    data: post,
    isPending: loadingPost,
    isError,
    error,
  } = useQuery({
    queryKey: postsKeys.detail(postId ?? ''),
    queryFn: () => fetchPost(postId!),
    enabled: !!postId,
  });

  useEffect(() => {
    if (post) {
      setDefaults({ title: post.title, content: post.content });
    }
  }, [post]);

  const updateMutation = useMutation({
    mutationFn: (input: { title: string; content: string }) => {
      if (!accessToken || !postId) throw new Error('로그인이 필요합니다.');
      return updatePost(accessToken, postId, input);
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: postsKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: postsKeys.detail(updated.id),
      });
      navigate(`/posts/${updated.id}`, { replace: true });
    },
  });

  const [state, formAction] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const parsed = parseCreatePostForm(formData);
      if (!parsed.success) {
        const fe = parsed.error.flatten().fieldErrors;
        return {
          error: null,
          fieldErrors: {
            title: fe.title?.[0],
            content: fe.content?.[0],
          },
        };
      }
      try {
        await updateMutation.mutateAsync(parsed.data);
        return { error: null, fieldErrors: null };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : '오류',
          fieldErrors: null,
        };
      }
    },
    { error: null, fieldErrors: null },
  );

  const err = error as FetchErr | null;

  if (!postId) {
    return <Navigate to="/posts" replace />;
  }

  if (isError && err?.status === 404) {
    return <Navigate to="/posts" replace />;
  }

  if (
    post &&
    user &&
    post.authorId &&
    post.authorId !== user.id
  ) {
    return <Navigate to={`/posts/${postId}`} replace />;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1 px-0" asChild>
        <Link to={`/posts/${postId}`}>← 글 보기</Link>
      </Button>

      {isError && err?.status !== 404 ? (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{err?.message}</AlertDescription>
        </Alert>
      ) : null}

      {loadingPost || !defaults ? (
        <div className="text-muted-foreground flex items-center gap-2 py-12 text-sm">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          불러오는 중…
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>글 수정</CardTitle>
            <CardDescription>제목·내용을 수정한 뒤 저장합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {state.error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>오류</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}
            <form
              key={`${defaults.title}\0${defaults.content}`}
              action={formAction}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-title">제목</Label>
                <Input
                  id="edit-title"
                  name="title"
                  maxLength={200}
                  defaultValue={defaults.title}
                  aria-invalid={!!state.fieldErrors?.title}
                />
                {state.fieldErrors?.title ? (
                  <p className="text-destructive text-xs">
                    {state.fieldErrors.title}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">내용</Label>
                <Textarea
                  id="edit-content"
                  name="content"
                  rows={10}
                  className="min-h-40 resize-y"
                  defaultValue={defaults.content}
                  aria-invalid={!!state.fieldErrors?.content}
                />
                {state.fieldErrors?.content ? (
                  <p className="text-destructive text-xs">
                    {state.fieldErrors.content}
                  </p>
                ) : null}
              </div>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="gap-2"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    저장 중…
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
