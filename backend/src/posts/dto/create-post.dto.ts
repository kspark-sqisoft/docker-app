/**
 * 글 작성 요청 본문의 형태 + 검증 규칙(class-validator).
 * main.ts 의 ValidationPipe 가 데코레이터를 읽어 자동으로 검사합니다.
 */
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
