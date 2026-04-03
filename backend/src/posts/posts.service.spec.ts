import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
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

  it('findAllForList — 목록 매핑', async () => {
    const rows = [
      {
        id: 'a',
        title: 't',
        createdAt: new Date(),
        authorId: 'u1',
        author: { name: 'Kim' },
      },
    ] as Post[];
    repo.find.mockResolvedValue(rows);

    const out = await service.findAllForList();
    expect(out[0]).toMatchObject({
      id: 'a',
      title: 't',
      authorId: 'u1',
      authorName: 'Kim',
    });
    expect(repo.find).toHaveBeenCalled();
  });

  it('findOne — 없으면 NotFoundException', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });

  it('remove — 작성자 아니면 ForbiddenException', async () => {
    repo.findOne.mockResolvedValue({
      id: 'p',
      authorId: 'other',
    });
    await expect(service.remove('p', 'me')).rejects.toThrow(ForbiddenException);
  });

  it('remove — 작성자면 삭제', async () => {
    repo.findOne.mockResolvedValue({ id: 'p', authorId: 'me' });
    repo.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove('p', 'me')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('p');
  });

  it('update — 필드 없으면 BadRequestException', async () => {
    await expect(service.update('p', {}, 'me')).rejects.toThrow(
      BadRequestException,
    );
  });
});
