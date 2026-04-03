import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/app/layouts/RootLayout';
import { PostsLayout } from '@/app/layouts/PostsLayout';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PostCreatePage } from '@/pages/PostCreatePage';
import { PostDetailPage } from '@/pages/PostDetailPage';
import { PostEditPage } from '@/pages/PostEditPage';
import { PostListPage } from '@/pages/PostListPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';

/** 라우트 메타 — `PageTitleHeading` 에서 제목으로 사용 */
export type AppRouteHandle = {
  title?: string;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/posts" replace /> },
      {
        path: 'login',
        element: <LoginPage />,
        handle: { title: '로그인' } satisfies AppRouteHandle,
      },
      {
        path: 'register',
        element: <RegisterPage />,
        handle: { title: '회원가입' } satisfies AppRouteHandle,
      },
      {
        path: 'profile',
        handle: { title: '프로필' } satisfies AppRouteHandle,
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: 'posts',
        handle: { title: '게시판' } satisfies AppRouteHandle,
        element: <PostsLayout />,
        children: [
          {
            index: true,
            element: <PostListPage />,
            handle: { title: '게시판' } satisfies AppRouteHandle,
          },
          {
            path: 'new',
            handle: { title: '글 작성' } satisfies AppRouteHandle,
            element: (
              <RequireAuth>
                <PostCreatePage />
              </RequireAuth>
            ),
          },
          {
            path: ':postId/edit',
            handle: { title: '글 수정' } satisfies AppRouteHandle,
            element: (
              <RequireAuth>
                <PostEditPage />
              </RequireAuth>
            ),
          },
          {
            path: ':postId',
            element: <PostDetailPage />,
            handle: { title: '글 보기' } satisfies AppRouteHandle,
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
        handle: { title: '페이지를 찾을 수 없음' } satisfies AppRouteHandle,
      },
    ],
  },
]);
