/**
 * 루트 모듈: 설정(Config)·DB(TypeORM)·기능 모듈(Health, Posts, Auth)을 조립합니다.
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { Post } from './posts/entities/post.entity';
import { PostsModule } from './posts/posts.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 어느 모듈에서든 ConfigService 주입 가능
      validate: validateEnv, // 기동 시 .env 값을 Zod 로 검증
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV', 'development');
        return {
          type: 'postgres',
          host: config.get('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get('DB_USERNAME', 'board'),
          password: config.get('DB_PASSWORD', 'board'),
          database: config.get('DB_NAME', 'board'),
          entities: [Post, User],
          synchronize: true, // 공부용: 엔티티 변경 시 스키마 자동 맞춤 (운영에서는 보통 false + 마이그레이션)
          logging: nodeEnv === 'development', // 개발에서만 SQL 로그
        };
      },
      inject: [ConfigService],
    }),
    HealthModule,
    PostsModule,
    AuthModule,
  ],
})
export class AppModule {}
