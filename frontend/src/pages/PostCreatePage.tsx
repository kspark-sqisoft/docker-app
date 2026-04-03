import { useActionState, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPost, postsKeys } from '@/api/posts';
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
import { CreateSubmitButton } from '@/features/posts/components/CreateSubmitButton';
import { PostImageAttachments } from '@/features/posts/components/PostImageAttachments';

type FormState = {
  error: string | null;
  fieldErrors: { title?: string; content?: string } | null;
};

export function PostCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const imageUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    imageUrlsRef.current = imageUrls;
  }, [imageUrls]);

  const createMutation = useMutation({
    mutationFn: (input: {
      title: string;
      content: string;
      imageUrls?: string[];
    }) => {
      if (!accessToken) throw new Error('로그인이 필요합니다.');
      return createPost(accessToken, input);
    },
    onSuccess: (post) => {
      void queryClient.invalidateQueries({ queryKey: postsKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: postsKeys.detail(post.id),
      });
      navigate(`/posts/${post.id}`, { replace: true });
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
        const urls = imageUrlsRef.current;
        await createMutation.mutateAsync({
          ...parsed.data,
          ...(urls.length > 0 ? { imageUrls: urls } : {}),
        });
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

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1 px-0" asChild>
        <Link to="/posts">← 목록</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>새 글</CardTitle>
          <CardDescription>제목과 내용을 입력한 뒤 등록합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="post-title">제목</Label>
              <Input
                id="post-title"
                name="title"
                maxLength={200}
                placeholder="제목 (최대 200자)"
                autoComplete="off"
                aria-invalid={!!state.fieldErrors?.title}
              />
              {state.fieldErrors?.title ? (
                <p className="text-destructive text-xs">
                  {state.fieldErrors.title}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-content">내용</Label>
              <Textarea
                id="post-content"
                name="content"
                rows={10}
                placeholder="내용을 입력하세요"
                className="min-h-40 resize-y"
                aria-invalid={!!state.fieldErrors?.content}
              />
              {state.fieldErrors?.content ? (
                <p className="text-destructive text-xs">
                  {state.fieldErrors.content}
                </p>
              ) : null}
            </div>
            {accessToken ? (
              <PostImageAttachments
                accessToken={accessToken}
                imageUrls={imageUrls}
                onChange={setImageUrls}
                onBusyChange={setImageBusy}
              />
            ) : null}
            <CreateSubmitButton extraDisabled={imageBusy} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
