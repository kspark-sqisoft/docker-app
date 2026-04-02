/**
 * HTTP 라우트만 담당. URL·메서드·파라미터를 받아 Service 에 위임합니다.
 * (비즈니스·DB 는 PostsService)
 */
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

// 전역 prefix api 와 합쳐져 최종 경로는 /api/posts
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  @Post()
  create(@Body() dto: CreatePostDto) {
    // Body 는 ValidationPipe 가 CreatePostDto 규칙으로 검증한 뒤 넘어옴
    return this.postsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
}
