/**
 * JWT 액세스 토큰(Bearer) + httpOnly 리프레시 쿠키. fetch 시 credentials: 'include' 필수.
 */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthPayload = {
  accessToken: string;
  user: AuthUser;
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

let refreshInFlight: Promise<AuthPayload | null> | null = null;

/** 동시 호출 시 한 번만 네트워크(리프레시 로테이션 경쟁 방지). */
export function refreshAuthSession(): Promise<AuthPayload | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return null;
        return (await res.json()) as AuthPayload;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function registerAuth(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthPayload> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throwHttpError(res, await parseErrorMessage(res, '회원가입에 실패했습니다.'));
  }
  return res.json() as Promise<AuthPayload>;
}

export async function loginAuth(input: {
  email: string;
  password: string;
}): Promise<AuthPayload> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throwHttpError(res, await parseErrorMessage(res, '로그인에 실패했습니다.'));
  }
  return res.json() as Promise<AuthPayload>;
}

export async function logoutAuth(accessToken: string): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throwHttpError(res, await parseErrorMessage(res, '로그아웃에 실패했습니다.'));
  }
}

export async function fetchMe(accessToken: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/me', {
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throwHttpError(res, '프로필을 불러오지 못했습니다.');
  return res.json() as Promise<AuthUser>;
}

export async function updateProfileName(
  accessToken: string,
  name: string,
): Promise<AuthUser> {
  const res = await fetch('/api/auth/me', {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throwHttpError(res, await parseErrorMessage(res, '이름 저장에 실패했습니다.'));
  }
  return res.json() as Promise<AuthUser>;
}

export async function uploadAvatar(
  accessToken: string,
  file: File,
): Promise<AuthUser> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/auth/me/avatar', {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
  if (!res.ok) {
    throwHttpError(res, await parseErrorMessage(res, '이미지 업로드에 실패했습니다.'));
  }
  return res.json() as Promise<AuthUser>;
}
