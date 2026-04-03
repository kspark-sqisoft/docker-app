import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiTags,
} from '@nestjs/swagger';
import {
  ACCESS_TOKEN_REF,
  REFRESH_COOKIE_SECURITY_REF,
} from '../bootstrap/configure-swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { resolveUploadsRoot } from '../bootstrap/configure-app';
import type { SafeUser } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from './decorators/current-user.decorator';

const imageMime = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(dto, res);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth(ACCESS_TOKEN_REF)
  @UseGuards(AuthGuard('jwt'))
  logout(
    @CurrentUser() user: SafeUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(user.id, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refreshTokens(req, res);
  }

  @Get('me')
  @ApiBearerAuth(ACCESS_TOKEN_REF)
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: SafeUser) {
    return user;
  }

  @Patch('me')
  @ApiBearerAuth(ACCESS_TOKEN_REF)
  @UseGuards(AuthGuard('jwt'))
  updateMe(@CurrentUser() user: SafeUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateName(user.id, dto.name);
  }

  @Post('me/avatar')
  @ApiBearerAuth(ACCESS_TOKEN_REF)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: '프로필 이미지' },
      },
    },
  })
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) =>
          cb(null, join(resolveUploadsRoot(), 'profiles')),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || '.bin';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (imageMime.has(file.mimetype)) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException(
            '이미지(jpeg, png, webp, gif)만 업로드할 수 있습니다.',
          ),
          false,
        );
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: SafeUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('파일이 필요합니다.');
    }
    return this.authService.saveAvatarFile(user.id, file);
  }
}
