import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CreateSubmitButtonProps = {
  /** 이미지 업로드 등 폼 밖 비동기 작업 중 비활성화 */
  extraDisabled?: boolean;
};

/** React 19: 같은 form 안의 자식에서만 useFormStatus 사용 가능 */
export function CreateSubmitButton({ extraDisabled }: CreateSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full gap-2 sm:w-auto"
      disabled={pending || extraDisabled}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          등록 중…
        </>
      ) : (
        '등록'
      )}
    </Button>
  );
}
