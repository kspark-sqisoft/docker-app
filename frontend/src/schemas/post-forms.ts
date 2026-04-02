import { z } from 'zod';

/**
 * 브라우저 폼(FormData) 검증. 백엔드 CreatePostDto 와 규칙을 맞춰 두면
 * 서버 도달 전에 같은 실수를 줄일 수 있습니다.
 */
export const createPostFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력하세요.')
    .max(200, '제목은 200자 이하여야 합니다.'),
  content: z.string().trim().min(1, '내용을 입력하세요.'),
});

export type CreatePostFormValues = z.infer<typeof createPostFormSchema>;

export function parseCreatePostForm(formData: FormData) {
  return createPostFormSchema.safeParse({
    title: String(formData.get('title') ?? ''),
    content: String(formData.get('content') ?? ''),
  });
}

/** 삭제 폼 hidden id — UUID 가 아니면 악의적/깨진 요청으로 간주 */
export const postIdSchema = z.string().uuid('잘못된 글 ID 입니다.');

export function parsePostIdFromForm(formData: FormData) {
  return postIdSchema.safeParse(String(formData.get('id') ?? ''));
}
