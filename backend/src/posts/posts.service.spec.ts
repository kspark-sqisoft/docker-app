import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostsService } from './posts.service';

/**
 * PostsService 단위 테스트
 *
 * 진짜 DB 대신 TypeORM Repository 를 **가짜(mock)** 로 주입합니다.
 * → DB 없이도 "서비스가 저장소를 올바른 인자로 호출하는지"만 검증합니다.
 */
describe('PostsService', () => {
  let service: PostsService;
  let repo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    // 각 테스트마다 새 mock — 호출 기록가 서로 섞이지 않게 함
    repo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        // Nest 가 원래 주입하던 Repository 대신 우리가 만든 mock 객체 사용
        { provide: getRepositoryToken(Post), useValue: repo },
      ],
    }).compile();

    service = module.get(PostsService);
  });

  it('findAll — createdAt 내림차순으로 조회', async () => {
    const rows: Post[] = [];
    repo.find.mockResolvedValue(rows);

    await expect(service.findAll()).resolves.toEqual(rows);
    // 비즈니스 규칙: 최신 글이 위로 오도록 order 옵션을 넘기는지 확인
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
    // TypeORM delete 결과: affected === 0 이면 해당 id 행이 없었음
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
