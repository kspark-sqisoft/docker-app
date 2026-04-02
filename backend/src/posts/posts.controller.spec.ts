import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

/**
 * PostsController 단위 테스트
 *
 * HTTP 까지는 올리지 않고, 컨트롤러가 **PostsService 메서드만 호출하고 결과를 그대로 돌려주는지** 확인합니다.
 * (라우팅·DTO 파이프는 E2E 나 통합 테스트에서 다루는 경우가 많습니다.)
 */
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
    // @Body() 로 받은 객체가 서비스까지 그대로 전달되는지
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('DELETE posts/:id — remove에 id 전달', async () => {
    service.remove.mockResolvedValue(undefined);

    await expect(controller.remove('abc')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('abc');
  });
});
