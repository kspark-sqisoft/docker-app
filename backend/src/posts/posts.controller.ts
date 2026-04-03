/**
 * HTTP 라우트. 목록·상세는 공개, 작성·수정·삭제는 JWT + 작성자 일치.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SafeUser } from '../users/users.service';
import { resolveUploadsRoot } from '../bootstrap/configure-app';
import { ACCESS_TOKEN_REF } from '../bootstrap/configure-swagger';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

const imageMime = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll() {
    return this.postsService.findAllForList();
  }

  @Post('images')
  @ApiBearerAuth(ACCESS_TOKEN_REF)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '게시글 본문용 이미지',
        },
      },
    },
  })
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) =>
          cb(null, join(resolveUploadsRoot(), 'posts')),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || '.bin';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
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
  uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('파일이 필요합니다.');
    }
    return { url: `/uploads/posts/${file.filename}` };
  }

  @Post()
  @ApiBearerAuth(ACCESS_TOKEN_REF)
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: CreatePostDto, @CurrentUser() user: SafeUser) {
    return this.postsService.create(dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth(ACCESS_TOKEN_REF)
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.postsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiBearerAuth(ACCESS_TOKEN_REF)
  @UseGuards(AuthGuard('jwt'))
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.postsService.remove(id, user.id);
  }
}
