/**
 * posts 도메인 묶음: 이 모듈 안에서 Post 엔티티용 Repository·Controller·Service 를 등록합니다.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Post])], // PostsService 에 Repository<Post> 주입 가능하게 함
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
