import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePostDto } from './create-post.dto';

/**
 * 평범한 객체를 DTO 클래스 인스턴스로 바꾼 뒤 class-validator 로 검사합니다.
 * (HTTP 요청이 들어올 때 ValidationPipe 가 하는 일과 같은 종류의 검증)
 */
async function validateDto(input: object) {
  const dto = plainToInstance(CreatePostDto, input);
  return validate(dto);
}

describe('CreatePostDto', () => {
  it('유효한 title·content 통과', async () => {
    const errors = await validateDto({ title: '제목', content: '내용' });
    expect(errors).toHaveLength(0);
  });

  it('빈 title 실패', async () => {
    // @IsNotEmpty() 위반
    const errors = await validateDto({ title: '', content: 'c' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('title 200자 초과 실패', async () => {
    // @MaxLength(200) 위반
    const errors = await validateDto({
      title: 'x'.repeat(201),
      content: 'ok',
    });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('content 비어 있으면 실패', async () => {
    const errors = await validateDto({ title: 'ok', content: '' });
    expect(errors.length).toBeGreaterThan(0);
  });
});
