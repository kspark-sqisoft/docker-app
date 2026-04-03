import { PostList } from '@/features/posts/components/PostList';
import { useAuthStore } from '@/features/auth/store/auth-store';

export function PostListPage() {
  const avatarError = useAuthStore((s) => s.avatarError);

  return <PostList extraBannerError={avatarError} />;
}
