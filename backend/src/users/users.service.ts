import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

export type SafeUser = {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  toSafe(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    const user = this.usersRepo.create({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name.trim(),
      profileImageUrl: null,
      refreshTokenHash: null,
    });
    return this.usersRepo.save(user);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
        passwordHash: true,
        refreshTokenHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByRefreshHash(hash: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { refreshTokenHash: hash },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
        passwordHash: true,
        refreshTokenHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async setRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.usersRepo.update({ id: userId }, { refreshTokenHash: hash });
  }

  async updateProfile(userId: string, name: string): Promise<SafeUser> {
    const res = await this.usersRepo.update({ id: userId }, { name: name.trim() });
    if (!res.affected) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return this.toSafe(user);
  }

  async setProfileImageUrl(
    userId: string,
    profileImageUrl: string | null,
  ): Promise<SafeUser> {
    await this.usersRepo.update({ id: userId }, { profileImageUrl });
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return this.toSafe(user);
  }
}
