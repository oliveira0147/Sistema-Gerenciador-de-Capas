import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameFolderDto } from './dto/rename-folder.dto';
import { StorageService } from './storage.service';
import { memoryStorage } from 'multer';
import { createReadStream } from 'node:fs';
import * as path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

@UseGuards(JwtAuthGuard)
@Controller('api/folders')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get()
  async list(@Query('path') relPath?: string) {
    const data = await this.storageService.listFolderCards(relPath ?? '');
    return data;
  }

  @Post()
  async create(@Body() dto: CreateFolderDto) {
    await this.storageService.createFolderAt(dto.parentPath, dto.name);
    return { ok: true };
  }

  @Get('files')
  async listFiles(@Query('path') relPath?: string) {
    return this.storageService.listFiles(relPath ?? '');
  }

  @Get('search')
  async search(@Query('query') query?: string) {
    const q = (query ?? '').trim();
    if (!q) {
      return { folders: [], files: [] };
    }
    return this.storageService.search(q);
  }

  @Get('file/view')
  async viewFile(
    @Query('path') filePath: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
      throw new BadRequestException('path é obrigatório.');
    }

    const file = await this.storageService.getFileForRead(filePath);
    res.setHeader('Content-Length', String(file.size));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Type',
      this.getContentType(file.filename, file.isImage),
    );
    createReadStream(file.absPath).pipe(res);
  }

  @Get('file/download')
  async downloadFile(
    @Query('path') filePath: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
      throw new BadRequestException('path é obrigatório.');
    }

    const file = await this.storageService.getFileForRead(filePath);

    if (file.isImage) {
      const pdf = await this.buildA4PdfFromImage(file.absPath, file.filename);
      const downloadName = this.replaceExtension(file.filename, '.pdf');
      res.setHeader('Content-Length', String(pdf.length));
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${this.encodeRFC5987(downloadName)}`,
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.end(Buffer.from(pdf));
      return;
    }

    res.setHeader('Content-Length', String(file.size));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${this.encodeRFC5987(file.filename)}`,
    );
    res.setHeader('Content-Type', 'application/octet-stream');
    createReadStream(file.absPath).pipe(res);
  }

  @Delete('file')
  async deleteFile(@Query('path') filePath: string) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
      throw new BadRequestException('path é obrigatório.');
    }
    await this.storageService.deleteFile(filePath);
    return { ok: true };
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFiles() files: unknown,
    @Body() body: { path?: string; names?: string | string[] },
  ) {
    if (!Array.isArray(files)) {
      throw new BadRequestException('Arquivos inválidos.');
    }

    const normalizedFiles = files.map((f) => {
      if (typeof f !== 'object' || f === null) {
        throw new BadRequestException('Arquivo inválido.');
      }
      if (!('buffer' in f) || !('originalname' in f) || !('mimetype' in f)) {
        throw new BadRequestException('Arquivo inválido.');
      }

      const buffer = (f as { buffer: unknown }).buffer;
      const originalname = (f as { originalname: unknown }).originalname;
      const mimetype = (f as { mimetype: unknown }).mimetype;

      if (!Buffer.isBuffer(buffer)) {
        throw new BadRequestException('Arquivo inválido.');
      }
      if (typeof originalname !== 'string' || originalname.trim() === '') {
        throw new BadRequestException('Arquivo inválido.');
      }
      if (typeof mimetype !== 'string' || !mimetype.startsWith('image/')) {
        throw new BadRequestException('Apenas imagens são permitidas.');
      }

      return { buffer, originalname };
    });

    const pathValue = body.path ?? '';
    const namesRaw = body.names;
    const desiredNames = Array.isArray(namesRaw)
      ? namesRaw
      : typeof namesRaw === 'string'
        ? [namesRaw]
        : undefined;

    const result = await this.storageService.saveImages({
      relPath: pathValue,
      files: normalizedFiles,
      desiredNames,
    });

    return { ok: true, saved: result.saved };
  }

  @Patch()
  async renameDeep(@Body() dto: RenameFolderDto) {
    if (!dto.path) {
      throw new BadRequestException('path é obrigatório.');
    }
    await this.storageService.renameFolderAt(dto.path, dto.newName);
    return { ok: true };
  }

  @Patch(':name')
  async rename(@Param('name') name: string, @Body() dto: RenameFolderDto) {
    await this.storageService.renameFolder(name, dto.newName);
    return { ok: true };
  }

  @Delete(':name')
  async remove(@Param('name') name: string) {
    await this.storageService.deleteFolder(name);
    return { ok: true };
  }

  private getContentType(filename: string, isImage: boolean): string {
    if (!isImage) return 'application/octet-stream';
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.webp') return 'image/webp';
    return 'application/octet-stream';
  }

  private replaceExtension(filename: string, newExt: string): string {
    const ext = path.extname(filename);
    if (!ext) return filename + newExt;
    return filename.slice(0, -ext.length) + newExt;
  }

  private async buildA4PdfFromImage(
    absPath: string,
    filename: string,
  ): Promise<Uint8Array> {
    const ext = path.extname(filename).toLowerCase();
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
      throw new BadRequestException(
        'Formato de imagem não suportado para PDF. Use JPG ou PNG.',
      );
    }

    const input = sharp(absPath).rotate();
    const meta = await input.metadata();
    if (!meta.width || !meta.height) {
      throw new BadRequestException('Não foi possível ler a imagem.');
    }

    const isLandscape = meta.width > meta.height;

    const pageWidth = isLandscape ? 841.89 : 595.28;
    const pageHeight = isLandscape ? 595.28 : 841.89;

    const targetWidthPx = isLandscape ? 3508 : 2480;
    const targetHeightPx = isLandscape ? 2480 : 3508;

    const rendered = await sharp(absPath)
      .rotate()
      .resize(targetWidthPx, targetHeightPx, {
        fit: 'cover',
        position: 'centre',
      })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([pageWidth, pageHeight]);
    const image = await pdf.embedPng(rendered);
    page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    return pdf.save();
  }

  private encodeRFC5987(value: string): string {
    return encodeURIComponent(value)
      .replaceAll("'", '%27')
      .replaceAll('(', '%28')
      .replaceAll(')', '%29')
      .replaceAll('*', '%2A');
  }
}
