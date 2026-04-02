/**
 * 게시판 UI 한 화면.
 *
 * 데이터 흐름 요약:
 * - 목록: useQuery + fetchPosts → postsKeys.list() 캐시
 * - 작성/삭제: useMutation + createPost/deletePost → 성공 여부와 관계없이 onSettled 에서 목록 무효화(invalidate)
 * - 폼: React 19 useActionState + FormData → Zod(parseCreatePostForm) → 통과 시 mutateAsync
 * - 제출 버튼 로딩: useFormStatus (같은 form 의 자식이어야 함)
 */
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Inbox,
  Loader2,
  MessageSquareText,
  Trash2,
} from 'lucide-react';
import { createPost, deletePost, fetchPosts, postsKeys } from '@/api/posts';
import { parseCreatePostForm, parsePostIdFromForm } from '@/schemas/post-forms';
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type CreateFormState = {
  error: string | null;
  fieldErrors: { title?: string; content?: string } | null;
};

/** React 19: 같은 <form> 안의 자식에서만 useFormStatus 사용 가능 — 전송 중 버튼 비활성·문구 */
function CreateSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full gap-2 sm:w-auto"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          등록 중…
        </>
      ) : (
        '등록'
      )}
    </Button>
  );
}

/** 삭제 폼 전용 — CreateSubmitButton 과 동일하게 useFormStatus 로 pending 표시 */
function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      className="shrink-0 gap-1.5"
      disabled={pending}
    >
      <Trash2 className="size-3.5" aria-hidden />
      {pending ? '삭제 중…' : '삭제'}
    </Button>
  );
}

type DeleteFormState = { error: string | null };

/** 글 카드마다 작은 삭제 폼: hidden id + 서버 삭제는 부모가 넘긴 mutateAsync */
function DeletePostForm({
  id,
  onDelete,
}: {
  id: string;
  onDelete: (postId: string) => Promise<void>;
}) {
  const [state, formAction] = useActionState(
    async (
      _prev: DeleteFormState,
      formData: FormData,
    ): Promise<DeleteFormState> => {
      // Zod 로 UUID 검증 후 API 호출
      const idParsed = parsePostIdFromForm(formData);
      if (!idParsed.success) {
        const msg = idParsed.error.issues[0]?.message ?? '잘못된 요청입니다.';
        return { error: msg };
      }
      try {
        await onDelete(idParsed.data);
        return { error: null };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : '삭제에 실패했습니다.',
        };
      }
    },
    { error: null },
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction} className="inline">
        <input type="hidden" name="id" value={id} />
        <DeleteSubmitButton />
      </form>
      {state.error ? (
        <p className="text-destructive max-w-48 text-right text-xs leading-tight">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

function App() {
  const queryClient = useQueryClient();
  /** 등록 성공 시 폼 리셋용 — key 변경으로 비제어 input 초기화 */
  const [createFormKey, setCreateFormKey] = useState(0);

  const invalidatePostList = () =>
    queryClient.invalidateQueries({ queryKey: postsKeys.list() });

  const {
    data: posts = [],
    isPending: listLoading,
    isError: listIsError,
    error: listErrorRaw,
    isFetching: listFetching,
  } = useQuery({
    queryKey: postsKeys.list(),
    queryFn: fetchPosts,
  });

  const listErrorMessage = listIsError
    ? listErrorRaw instanceof Error
      ? listErrorRaw.message
      : '오류'
    : null;

  // 작성·삭제 후 항상 목록 쿼리를 무효화 → 백그라운드에서 목록 다시 가져옴
  const createMutation = useMutation({
    mutationFn: createPost,
    onSettled: () => {
      void invalidatePostList();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSettled: () => {
      void invalidatePostList();
    },
  });

  const [createState, createFormAction] = useActionState(
    async (
      _prev: CreateFormState,
      formData: FormData,
    ): Promise<CreateFormState> => {
      const parsed = parseCreatePostForm(formData); // 클라이언트 Zod 검증
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

      const { title, content } = parsed.data;

      try {
        await createMutation.mutateAsync({ title, content }); // Nest ValidationPipe 가 한 번 더 검증
        setCreateFormKey((k) => k + 1);
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

  const bannerError = listErrorMessage ?? createState.error;

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
        <header className="mb-10 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <MessageSquareText className="size-8" aria-hidden />
            <span className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              Notice Board
            </span>
          </div>
          <p className="text-muted-foreground text-pretty text-sm leading-relaxed md:text-base">
            로그인 없이 글 목록 · 작성 · 삭제 — TanStack Query, Zod 검증, React
            19 form actions, shadcn/ui
          </p>
          <Separator className="mt-6" />
        </header>

        <div className="flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle>새 글 작성</CardTitle>
              <CardDescription>
                <code className="text-muted-foreground text-xs">zod</code> 로 폼
                검증 →{' '}
                <code className="text-muted-foreground text-xs">
                  useMutation
                </code>{' '}
                +{' '}
                <code className="text-muted-foreground text-xs">
                  useActionState
                </code>{' '}
                →{' '}
                <code className="text-muted-foreground text-xs">
                  invalidateQueries
                </code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                key={createFormKey}
                action={createFormAction}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="post-title">제목</Label>
                  <Input
                    id="post-title"
                    name="title"
                    maxLength={200}
                    placeholder="제목 (최대 200자)"
                    autoComplete="off"
                    aria-invalid={!!createState.fieldErrors?.title}
                    defaultValue=""
                  />
                  {createState.fieldErrors?.title ? (
                    <p className="text-destructive text-xs">
                      {createState.fieldErrors.title}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-content">내용</Label>
                  <Textarea
                    id="post-content"
                    name="content"
                    rows={5}
                    placeholder="내용을 입력하세요"
                    className="min-h-28 resize-y"
                    aria-invalid={!!createState.fieldErrors?.content}
                    defaultValue=""
                  />
                  {createState.fieldErrors?.content ? (
                    <p className="text-destructive text-xs">
                      {createState.fieldErrors.content}
                    </p>
                  ) : null}
                </div>
                <CreateSubmitButton />
              </form>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-lg font-medium">글 목록</h2>
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

            {bannerError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>문제가 발생했습니다</AlertTitle>
                <AlertDescription>{bannerError}</AlertDescription>
              </Alert>
            ) : null}

            {listLoading ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center text-sm">
                  <Inbox
                    className="text-muted-foreground/40 size-10"
                    aria-hidden
                  />
                  <p>아직 글이 없습니다. 위에서 첫 글을 남겨 보세요.</p>
                </CardContent>
              </Card>
            ) : (
              <ul className="flex flex-col gap-4">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Card>
                      <CardHeader className="border-b pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <CardTitle className="text-base leading-snug">
                              {p.title}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {new Date(p.createdAt).toLocaleString('ko-KR')}
                            </CardDescription>
                          </div>
                          <DeletePostForm
                            id={p.id}
                            onDelete={deleteMutation.mutateAsync}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-card-foreground whitespace-pre-wrap text-sm leading-relaxed">
                          {p.content}
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
