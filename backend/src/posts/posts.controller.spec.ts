import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

describe('PostsController', () => {
  let controller: PostsController;
  let service: {
    findAll: jest.Mock;
    create: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [{ provide: PostsService, useValue: service }],
    }).compile();

    controller = module.get(PostsController);
  });

  it('GET posts — 서비스 findAll 결과 반환', async () => {
    const list = [{ id: '1', title: 'a', content: 'b', createdAt: new Date() }];
    service.findAll.mockResolvedValue(list);

    await expect(controller.findAll()).resolves.toEqual(list);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('POST posts — create에 body 전달', async () => {
    const dto = { title: 't', content: 'c' };
    const saved = { id: 'u', ...dto, createdAt: new Date() };
    service.create.mockResolvedValue(saved);

    await expect(controller.create(dto)).resolves.toEqual(saved);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('DELETE posts/:id — remove에 id 전달', async () => {
    service.remove.mockResolvedValue(undefined);

    await expect(controller.remove('abc')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('abc');
  });
});
