import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { unlink } from 'fs/promises';
import { join } from 'path';
import type { Response } from 'express';
import { resolveUploadsRoot } from '../bootstrap/configure-app';
import type { SafeUser } from '../users/users.service';
import { UsersService } from '../users/users.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { AccessTokenPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private refreshCookieName(): string {
    return this.config.get<string>('REFRESH_COOKIE_NAME', 'refresh_token');
  }

  private refreshCookieMaxAgeMs(): number {
    const days = this.config.get<number>('JWT_REFRESH_EXPIRES_DAYS', 7);
    return days * 24 * 60 * 60 * 1000;
  }

  private refreshCookieSecure(): boolean {
    return this.config.get<boolean>('REFRESH_COOKIE_SECURE', false);
  }

  private attachRefreshCookie(res: Response, rawRefresh: string): void {
    res.cookie(this.refreshCookieName(), rawRefresh, {
      httpOnly: true,
      secure: this.refreshCookieSecure(),
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: this.refreshCookieMaxAgeMs(),
    });
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie(this.refreshCookieName(), {
      path: '/api/auth',
      httpOnly: true,
      secure: this.refreshCookieSecure(),
      sameSite: 'lax',
    });
  }

  private hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private newRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private signAccess(user: { id: string; email: string }): string {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  async register(dto: RegisterDto, res: Response) {
    const existing = await this.usersService.findByEmailWithPassword(dto.email);
    if (existing) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });
    const rawRefresh = this.newRefreshToken();
    await this.usersService.setRefreshTokenHash(
      user.id,
      this.hashRefreshToken(rawRefresh),
    );
    this.attachRefreshCookie(res, rawRefresh);
    const safe = this.usersService.toSafe(user);
    return {
      accessToken: this.signAccess(user),
      user: safe,
    };
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }
    const rawRefresh = this.newRefreshToken();
    await this.usersService.setRefreshTokenHash(
      user.id,
      this.hashRefreshToken(rawRefresh),
    );
    this.attachRefreshCookie(res, rawRefresh);
    const full = await this.usersService.findById(user.id);
    const safe = full
      ? this.usersService.toSafe(full)
      : this.usersService.toSafe(user);
    return {
      accessToken: this.signAccess(user),
      user: safe,
    };
  }

  async logout(userId: string, res: Response) {
    await this.usersService.setRefreshTokenHash(userId, null);
    this.clearRefreshCookie(res);
    return { ok: true as const };
  }

  async refreshTokens(
    req: { cookies?: Record<string, string> },
    res: Response,
  ) {
    const raw = req.cookies?.[this.refreshCookieName()];
    if (!raw || typeof raw !== 'string') {
      throw new UnauthorizedException('리프레시 토큰이 없습니다.');
    }
    const hash = this.hashRefreshToken(raw);
    const user = await this.usersService.findByRefreshHash(hash);
    if (!user) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }
    const rotated = this.newRefreshToken();
    await this.usersService.setRefreshTokenHash(
      user.id,
      this.hashRefreshToken(rotated),
    );
    this.attachRefreshCookie(res, rotated);
    const fresh = await this.usersService.findById(user.id);
    const safe: SafeUser = fresh
      ? this.usersService.toSafe(fresh)
      : this.usersService.toSafe(user);
    return {
      accessToken: this.signAccess(user),
      user: safe,
    };
  }

  async updateName(userId: string, name: string): Promise<SafeUser> {
    return this.usersService.updateProfile(userId, name);
  }

  async saveAvatarFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<SafeUser> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const prev = user.profileImageUrl;
    if (prev?.startsWith('/uploads/profiles/')) {
      const filename = prev.replace('/uploads/profiles/', '');
      if (filename && !filename.includes('..') && !filename.includes('/')) {
        try {
          await unlink(join(resolveUploadsRoot(), 'profiles', filename));
        } catch {
          /* ignore */
        }
      }
    }

    const url = `/uploads/profiles/${file.filename}`;
    return this.usersService.setProfileImageUrl(userId, url);
  }
}
