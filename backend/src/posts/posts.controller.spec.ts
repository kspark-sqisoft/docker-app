import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

describe('PostsController', () => {
  let controller: PostsController;
  let svc: {
    findAllForList: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    svc = {
      findAllForList: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [{ provide: PostsService, useValue: svc }],
    }).compile();

    controller = module.get(PostsController);
  });

  it('GET posts — findAllForList', async () => {
    const list = [{ id: '1', title: 'a', createdAt: new Date() }];
    svc.findAllForList.mockResolvedValue(list);
    await expect(controller.findAll()).resolves.toEqual(list);
  });

  it('GET posts/:id — findOne', async () => {
    const one = { id: '1', title: 'a', content: 'b', createdAt: new Date() };
    svc.findOne.mockResolvedValue(one);
    await expect(controller.findOne('1')).resolves.toEqual(one);
  });

  it('POST posts — create(userId)', async () => {
    const dto = { title: 't', content: 'c' };
    const user = { id: 'u', email: 'e', name: 'n', profileImageUrl: null, createdAt: new Date(), updatedAt: new Date() };
    const saved = { id: 'p', ...dto };
    svc.create.mockResolvedValue(saved);
    await expect(controller.create(dto, user as never)).resolves.toEqual(saved);
    expect(svc.create).toHaveBeenCalledWith(dto, 'u');
  });

  it('DELETE posts/:id — remove', async () => {
    const user = { id: 'u', email: 'e', name: 'n', profileImageUrl: null, createdAt: new Date(), updatedAt: new Date() };
    svc.remove.mockResolvedValue(undefined);
    await expect(controller.remove('abc', user as never)).resolves.toBeUndefined();
    expect(svc.remove).toHaveBeenCalledWith('abc', 'u');
  });
});
