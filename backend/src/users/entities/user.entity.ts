/**
 * 사용자 테이블. refreshTokenHash 는 브라우저 쿠키에 담기는 refresh 토큰의 SHA-256 해시입니다(평문 저장 지양).
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 320 })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  profileImageUrl: string | null;

  /** refresh 토큰(쿠키 값)의 SHA-256 hex. 로그아웃·재발급 시 갱신·null */
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  refreshTokenHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
