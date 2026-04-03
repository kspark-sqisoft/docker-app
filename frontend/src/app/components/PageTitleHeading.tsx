import { useMatches } from 'react-router-dom';

/** 본문 상단 페이지 제목 — 헤더와 시각적 계층 분리(사이트 툴바 vs 페이지 h1) */
export function PageTitleHeading() {
  const matches = useMatches();

  let title = 'Notice Board';
  for (let i = matches.length - 1; i >= 0; i--) {
    const h = matches[i].handle as { title?: string } | undefined;
    if (h?.title) {
      title = h.title;
      break;
    }
  }

  return (
    <h1 className="font-heading text-foreground mb-3 text-lg font-semibold tracking-tight sm:mb-4 sm:text-xl md:text-2xl">
      {title}
    </h1>
  );
}
