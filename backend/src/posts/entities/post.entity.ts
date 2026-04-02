/**
 * TypeORM 엔티티 = DB 테이블 `posts` 와 1:1 매핑되는 클래스.
 * 컬럼 타입·제약은 여기 정의하고, synchronize 시 스키마에 반영됩니다.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  content: string;

  @CreateDateColumn() // INSERT 시 DB 기본값처럼 생성 시각 기록
  createdAt: Date;
}
