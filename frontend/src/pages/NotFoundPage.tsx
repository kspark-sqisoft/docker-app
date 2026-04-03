import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">
        요청한 경로를 찾을 수 없습니다.
      </p>
      <Button asChild variant="outline">
        <Link to="/posts">게시판으로</Link>
      </Button>
    </div>
  );
}
