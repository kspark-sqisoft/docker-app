import { Outlet } from 'react-router-dom';
import { PageTitleHeading } from '@/app/components/PageTitleHeading';
import { SiteHeaderBar } from '@/app/components/SiteHeaderBar';

/**
 * 얇은 고정형 상단 바 + 본문(페이지 제목 포함). 모바일·데스크톱 공통 여백·높이 정리.
 */
export function RootLayout() {
  return (
    <div className="bg-background min-h-svh">
      <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto h-12 max-w-2xl px-3 sm:h-13 sm:px-4">
          <div className="flex h-full items-center">
            <SiteHeaderBar />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-3 pb-8 pt-3 sm:px-4 sm:pb-10 sm:pt-4 md:pt-5">
        <PageTitleHeading />
        <Outlet />
      </main>
    </div>
  );
}
