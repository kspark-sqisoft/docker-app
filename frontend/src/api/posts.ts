/**
 * 게시글 API. 작성·수정·삭제는 Bearer 토큰 필요, 목록·상세는 공개.
 */
export type PostListItem = {
  id: string;
  title: string;
  createdAt: string;
  authorId: string | null;
  authorName: string | null;
};

export type PostDetail = PostListItem & {
  content: string;
  updatedAt: string;
};

type FetchError = Error & { status: number };

function throwHttpError(res: Response, message: string): never {
  const err = new Error(message) as FetchError;
  err.status = res.status;
  throw err;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const m = body.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
  } catch {
    /* ignore */
  }
  return fallback;
}

function jsonAuthHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export const postsKeys = {
  all: ['posts'] as const,
  list: () => [...postsKeys.all, 'list'] as const,
  detail: (id: string) => [...postsKeys.all, 'detail', id] as const,
};

export async function fetchPostList(): Promise<PostListItem[]> {
  const res = await fetch('/api/posts');
  if (!res.ok) throwHttpError(res, '목록을 불러오지 못했습니다.');
  return res.json();
}

export async function fetchPost(id: string): Promise<PostDetail> {
  const res = await fetch(`/api/posts/${id}`);
  if (!res.ok) throwHttpError(res, '글을 불러오지 못했습니다.');
  return res.json();
}

export async function createPost(
  token: string,
  input: { title: string; content: string },
): Promise<PostDetail> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throwHttpError(res, await parseErrorMessage(res, '저장에 실패했습니다.'));
  }
  return res.json();
}

export async function updatePost(
  token: string,
  id: string,
  input: { title?: string; content?: string },
): Promise<PostDetail> {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'PATCH',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throwHttpError(res, await parseErrorMessage(res, '수정에 실패했습니다.'));
  }
  return res.json();
}

export async function deletePost(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throwHttpError(res, await parseErrorMessage(res, '삭제에 실패했습니다.'));
  }
}
