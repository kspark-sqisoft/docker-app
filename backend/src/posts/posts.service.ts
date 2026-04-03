/**
 * 글 도메인 로직 + TypeORM Repository 로 DB 접근.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

export type PostListItem = {
  id: string;
  title: string;
  createdAt: Date;
  authorId: string | null;
  authorName: string | null;
};

export type PostDetail = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string | null;
  authorName: string | null;
};

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
  ) {}

  async findAllForList(): Promise<PostListItem[]> {
    const posts = await this.postsRepository.find({
      select: {
        id: true,
        title: true,
        createdAt: true,
        authorId: true,
        author: { id: true, name: true },
      },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      createdAt: p.createdAt,
      authorId: p.authorId,
      authorName: p.author?.name ?? null,
    }));
  }

  async findOne(id: string): Promise<PostDetail> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      authorId: post.authorId,
      authorName: post.author?.name ?? null,
    };
  }

  async create(dto: CreatePostDto, authorId: string): Promise<PostDetail> {
    const entity = this.postsRepository.create({
      ...dto,
      authorId,
    });
    const saved = await this.postsRepository.save(entity);
    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdatePostDto,
    userId: string,
  ): Promise<PostDetail> {
    if (dto.title === undefined && dto.content === undefined) {
      throw new BadRequestException('수정할 제목 또는 내용이 필요합니다.');
    }
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    if (!post.authorId || post.authorId !== userId) {
      throw new ForbiddenException('본인이 작성한 글만 수정할 수 있습니다.');
    }
    if (dto.title !== undefined) post.title = dto.title;
    if (dto.content !== undefined) post.content = dto.content;
    await this.postsRepository.save(post);
    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    if (!post.authorId || post.authorId !== userId) {
      throw new ForbiddenException('본인이 작성한 글만 삭제할 수 있습니다.');
    }
    await this.postsRepository.delete(id);
  }
}
