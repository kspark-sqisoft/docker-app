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
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';
import { resolveUploadsRoot } from '../bootstrap/configure-app';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

const POST_IMAGE_PUBLIC_PREFIX = '/uploads/posts/';
const MAX_POST_IMAGES = 5;

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
  imageUrls: string[];
};

function diskPathForPostImageUrl(url: string): string | null {
  if (!url.startsWith(POST_IMAGE_PUBLIC_PREFIX)) return null;
  const name = url.slice(POST_IMAGE_PUBLIC_PREFIX.length);
  if (!name || name.includes('..') || name.includes('/')) return null;
  return join(resolveUploadsRoot(), 'posts', name);
}

async function unlinkPostImageFile(url: string): Promise<void> {
  const p = diskPathForPostImageUrl(url);
  if (!p) return;
  try {
    await unlink(p);
  } catch {
    /* ignore */
  }
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
  ) {}

  sanitizeImageUrls(raw: string[] | undefined | null): string[] {
    if (raw == null) return [];
    if (!Array.isArray(raw)) {
      throw new BadRequestException('imageUrls 는 배열이어야 합니다.');
    }
    if (raw.length > MAX_POST_IMAGES) {
      throw new BadRequestException(
        `이미지는 최대 ${MAX_POST_IMAGES}장까지 첨부할 수 있습니다.`,
      );
    }
    const seen = new Set<string>();
    for (const u of raw) {
      if (typeof u !== 'string' || !u.startsWith(POST_IMAGE_PUBLIC_PREFIX)) {
        throw new BadRequestException('허용되지 않은 이미지 경로입니다.');
      }
      const name = u.slice(POST_IMAGE_PUBLIC_PREFIX.length);
      if (!name || name.includes('..') || name.includes('/')) {
        throw new BadRequestException('허용되지 않은 이미지 경로입니다.');
      }
      if (seen.has(u)) {
        throw new BadRequestException('중복된 이미지 경로가 있습니다.');
      }
      seen.add(u);
    }
    return [...seen];
  }

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
      imageUrls: Array.isArray(post.imageUrls) ? post.imageUrls : [],
    };
  }

  async create(dto: CreatePostDto, authorId: string): Promise<PostDetail> {
    const imageUrls = this.sanitizeImageUrls(dto.imageUrls);
    const entity = this.postsRepository.create({
      title: dto.title,
      content: dto.content,
      authorId,
      imageUrls,
    });
    const saved = await this.postsRepository.save(entity);
    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdatePostDto,
    userId: string,
  ): Promise<PostDetail> {
    if (
      dto.title === undefined &&
      dto.content === undefined &&
      dto.imageUrls === undefined
    ) {
      throw new BadRequestException(
        '수정할 제목·내용 또는 첨부 이미지가 필요합니다.',
      );
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
    if (dto.imageUrls !== undefined) {
      const next = this.sanitizeImageUrls(dto.imageUrls);
      const prev = Array.isArray(post.imageUrls) ? post.imageUrls : [];
      const removed = prev.filter((u) => !next.includes(u));
      await Promise.all(removed.map((u) => unlinkPostImageFile(u)));
      post.imageUrls = next;
    }
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
    const urls = Array.isArray(post.imageUrls) ? post.imageUrls : [];
    await Promise.all(urls.map((u) => unlinkPostImageFile(u)));
    await this.postsRepository.delete(id);
  }
}
