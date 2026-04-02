/**
 * React 앱 마운트 지점.
 * TanStack Query(QueryClientProvider)로 하위 전체가 같은 캐시·설정을 공유합니다.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/query-client';
import './index.css';
import App from './App.tsx';

const queryClient = createQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
