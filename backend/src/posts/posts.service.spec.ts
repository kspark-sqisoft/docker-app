import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let repo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getRepositoryToken(Post), useValue: repo },
      ],
    }).compile();

    service = module.get(PostsService);
  });

  it('findAll — createdAt 내림차순으로 조회', async () => {
    const rows: Post[] = [];
    repo.find.mockResolvedValue(rows);

    await expect(service.findAll()).resolves.toEqual(rows);
    expect(repo.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });

  it('create — DTO로 엔티티 생성 후 저장', async () => {
    const dto = { title: '제목', content: '본문' };
    const entity = { id: 'uuid', ...dto, createdAt: new Date() } as Post;
    repo.create.mockReturnValue(entity);
    repo.save.mockResolvedValue(entity);

    await expect(service.create(dto)).resolves.toEqual(entity);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalledWith(entity);
  });

  it('remove — 없으면 NotFoundException', async () => {
    repo.delete.mockResolvedValue({ affected: 0, raw: [] });

    await expect(service.remove('missing-id')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove('missing-id')).rejects.toThrow(
      /Post missing-id not found/,
    );
  });

  it('remove — 삭제되면 완료', async () => {
    repo.delete.mockResolvedValue({ affected: 1, raw: [] });

    await expect(service.remove('exists-id')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('exists-id');
  });
});
