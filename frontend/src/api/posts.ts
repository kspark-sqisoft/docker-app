/**
 * 백엔드 REST API 호출. 경로는 상대(/api/...) — Vite proxy 또는 nginx 가 Nest 로 넘깁니다.
 * TanStack Query 의 queryFn / mutationFn 에서 이 함수들을 씁니다.
 */
export type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

type FetchError = Error & { status: number };

/** Query retry 시 4xx 구분용으로 status 를 Error 에 붙임 */
function throwHttpError(res: Response, message: string): never {
  const err = new Error(message) as FetchError;
  err.status = res.status;
  throw err;
}

/** TanStack Query 쿼리 키 — 무효화·프리페치 시 동일 키 사용 */
export const postsKeys = {
  all: ['posts'] as const,
  list: () => [...postsKeys.all, 'list'] as const,
};

export async function fetchPosts(): Promise<Post[]> {
  const res = await fetch('/api/posts');
  if (!res.ok) throwHttpError(res, '목록을 불러오지 못했습니다.');
  return res.json();
}

export async function createPost(input: {
  title: string;
  content: string;
}): Promise<void> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throwHttpError(res, '저장에 실패했습니다.');
}

export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
  if (!res.ok) throwHttpError(res, '삭제에 실패했습니다.');
}
