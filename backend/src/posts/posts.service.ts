/**
 * 글 도메인 로직 + TypeORM Repository 로 DB 접근.
 * Controller 는 이 클래스만 호출하고, 트랜잭션·복잡 규칙은 여기서 확장하기 좋습니다.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
  ) {}

  findAll(): Promise<Post[]> {
    return this.postsRepository.find({
      order: { createdAt: 'DESC' }, // 최신 글이 앞
    });
  }

  async create(dto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create(dto); // 엔티티 객체 생성(아직 저장 전)
    return this.postsRepository.save(post); // INSERT 후 저장된 행 반환
  }

  async remove(id: string): Promise<void> {
    const result = await this.postsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Post ${id} not found`);
    }
  }
}
