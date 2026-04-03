import { Outlet, useLocation } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

/**
 * 게시판 구역: 목록 루트(`/posts`)에서만 안내 문구 표시
 */
export function PostsLayout() {
  const { pathname } = useLocation();
  const showIntro = pathname === '/posts' || pathname === '/posts/';

  return (
    <>
      {showIntro ? (
        <>
          <p className="text-muted-foreground text-pretty text-xs leading-relaxed sm:text-sm">
            JWT 액세스 토큰 + httpOnly 리프레시 쿠키, 프로필 이미지(로컬 저장) —
            글 작성은 로그인 필요, 목록·보기는 공개입니다.
          </p>
          <Separator className="my-4 sm:my-6" />
        </>
      ) : null}
      <Outlet />
    </>
  );
}
