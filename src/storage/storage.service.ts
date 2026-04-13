import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { constants as fsConstants, promises as fs } from 'node:fs';
import { accessSync } from 'node:fs';
import * as path from 'node:path';

type FolderCard = {
  name: string;
  path: string;
  preview: FolderPreviewItem[];
  counts: { folders: number; files: number };
};

type FolderPreviewItem =
  | { kind: 'folder'; name: string }
  | { kind: 'file'; name: string; path: string; isImage: boolean };

type FileCard = {
  name: string;
  path: string;
  size: number;
  updatedAt: number;
  isImage: boolean;
};

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  private getRootDir(): string {
    const raw = this.config.getOrThrow<string>('STORAGE_ROOT');
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  }

  private async ensureRootExists(): Promise<void> {
    const root = this.getRootDir();
    await fs.mkdir(root, { recursive: true });
    accessSync(root, fsConstants.R_OK | fsConstants.W_OK);
  }

  private normalizeRelPath(relPath: string): string {
    const normalized = relPath.replaceAll('\\', '/').trim();
    if (normalized === '' || normalized === '.') {
      return '';
    }
    return normalized
      .split('/')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join(path.sep);
  }

  private resolvePath(relPath: string): string {
    const root = this.getRootDir();
    const normalized = this.normalizeRelPath(relPath);
    const target = path.resolve(root, normalized);
    const rootResolved = path.resolve(root);
    if (
      (normalized !== '' && target === rootResolved) ||
      !(target === rootResolved || target.startsWith(rootResolved + path.sep))
    ) {
      throw new ConflictException('Nome de pasta inválido.');
    }
    return target;
  }

  private joinRelPath(parent: string, name: string): string {
    const p = this.normalizeRelPath(parent);
    const child = name.trim();
    if (!p) return child;
    return path.join(p, child);
  }

  private toUrlPath(relPath: string): string {
    return relPath.split(path.sep).join('/');
  }

  private fromUrlPath(relPath: string): string {
    return relPath.replaceAll('\\', '/').split('/').join(path.sep);
  }

  private isImageFilename(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return (
      ext === '.jpg' ||
      ext === '.jpeg' ||
      ext === '.png' ||
      ext === '.gif' ||
      ext === '.webp'
    );
  }

  async listFiles(
    relDir: string,
  ): Promise<{ path: string; files: FileCard[] }> {
    await this.ensureRootExists();
    const safeRel = this.normalizeRelPath(relDir);
    const dirAbs = this.resolvePath(safeRel);
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });

    const files: FileCard[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const abs = path.join(dirAbs, entry.name);
      const stat = await fs.stat(abs);
      const rel = this.joinRelPath(safeRel, entry.name);
      files.push({
        name: entry.name,
        path: this.toUrlPath(rel),
        size: stat.size,
        updatedAt: stat.mtimeMs,
        isImage: this.isImageFilename(entry.name),
      });
    }

    files.sort((a, b) => b.updatedAt - a.updatedAt);
    return { path: this.toUrlPath(safeRel), files };
  }

  async getFileForRead(relFilePath: string): Promise<{
    absPath: string;
    filename: string;
    size: number;
    isImage: boolean;
  }> {
    await this.ensureRootExists();
    const safeRel = this.normalizeRelPath(this.fromUrlPath(relFilePath));
    const abs = this.resolvePath(safeRel);
    const stat = await fs.stat(abs).catch((err: unknown) => {
      if (this.isNodeError(err) && err.code === 'ENOENT') {
        throw new NotFoundException('Arquivo não encontrado.');
      }
      throw err;
    });
    if (!stat.isFile()) {
      throw new NotFoundException('Arquivo não encontrado.');
    }
    const filename = path.basename(abs);
    return {
      absPath: abs,
      filename,
      size: stat.size,
      isImage: this.isImageFilename(filename),
    };
  }

  async deleteFile(relFilePath: string): Promise<void> {
    await this.ensureRootExists();
    const safeRel = this.normalizeRelPath(this.fromUrlPath(relFilePath));
    const abs = this.resolvePath(safeRel);
    const stat = await fs.stat(abs).catch((err: unknown) => {
      if (this.isNodeError(err) && err.code === 'ENOENT') {
        throw new NotFoundException('Arquivo não encontrado.');
      }
      throw err;
    });
    if (!stat.isFile()) {
      throw new NotFoundException('Arquivo não encontrado.');
    }

    await fs.unlink(abs).catch((err: unknown) => {
      if (this.isNodeError(err) && err.code === 'ENOENT') {
        throw new NotFoundException('Arquivo não encontrado.');
      }
      throw err;
    });
  }

  private sanitizeFilename(filename: string): string {
    const trimmed = filename.trim();
    const withoutSeparators = trimmed
      .replaceAll('\\', '_')
      .replaceAll('/', '_');
    let withoutControl = '';
    for (const ch of withoutSeparators) {
      const code = ch.codePointAt(0);
      if (code === undefined) continue;
      if (code < 32) continue;
      if (code === 127) continue;
      withoutControl += ch;
    }
    const cleaned = withoutControl.trim();
    if (cleaned === '' || cleaned === '.' || cleaned === '..') {
      throw new ConflictException('Nome de arquivo inválido.');
    }
    if (cleaned.length > 255) {
      throw new ConflictException('Nome de arquivo muito grande.');
    }
    return cleaned;
  }

  private async getAvailableFilePath(
    dirAbs: string,
    filename: string,
  ): Promise<{ abs: string; finalName: string }> {
    const base = path.basename(filename);
    const ext = path.extname(base);
    const nameWithoutExt = ext ? base.slice(0, -ext.length) : base;

    let candidate = base;
    for (let i = 0; i < 2000; i++) {
      const abs = path.join(dirAbs, candidate);
      try {
        await fs.access(abs);
      } catch {
        return { abs, finalName: candidate };
      }
      candidate = `${nameWithoutExt} (${i + 1})${ext}`;
    }

    throw new ConflictException('Não foi possível gerar um nome único.');
  }

  async listFolderCards(relPath: string): Promise<{
    path: string;
    breadcrumbs: { name: string; path: string }[];
    folders: FolderCard[];
  }> {
    await this.ensureRootExists();
    const safeRel = this.normalizeRelPath(relPath);
    const dir = this.resolvePath(safeRel);
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const folders: FolderCard[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const entryRel = this.joinRelPath(safeRel, entry.name);
      const previewInfo = await this.getPreview(entryRel);
      folders.push({
        name: entry.name,
        path: this.toUrlPath(entryRel),
        preview: previewInfo.preview,
        counts: previewInfo.counts,
      });
    }

    folders.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const breadcrumbs: { name: string; path: string }[] = [
      { name: 'Início', path: '' },
    ];
    if (safeRel) {
      const parts = safeRel.split(path.sep);
      let acc = '';
      for (const part of parts) {
        acc = acc ? path.join(acc, part) : part;
        breadcrumbs.push({ name: part, path: this.toUrlPath(acc) });
      }
    }

    return { path: this.toUrlPath(safeRel), breadcrumbs, folders };
  }

  private async getPreview(relPath: string): Promise<{
    preview: FolderPreviewItem[];
    counts: { folders: number; files: number };
  }> {
    const abs = this.resolvePath(relPath);
    const entries = await fs.readdir(abs, { withFileTypes: true });
    let folders = 0;
    let files = 0;

    const preview: FolderPreviewItem[] = [];

    const sorted = [...entries].sort((a, b) => {
      const aDir = a.isDirectory() ? 0 : 1;
      const bDir = b.isDirectory() ? 0 : 1;
      if (aDir !== bDir) return aDir - bDir;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    for (const e of sorted) {
      if (e.isDirectory()) folders++;
      else if (e.isFile()) files++;

      if (preview.length >= 4) continue;

      if (e.isDirectory()) {
        preview.push({ kind: 'folder', name: e.name });
        continue;
      }

      if (e.isFile()) {
        const fileRel = this.joinRelPath(relPath, e.name);
        preview.push({
          kind: 'file',
          name: e.name,
          path: this.toUrlPath(fileRel),
          isImage: this.isImageFilename(e.name),
        });
      }
    }
    return { preview, counts: { folders, files } };
  }

  async listFolders(): Promise<string[]> {
    await this.ensureRootExists();
    const root = this.getRootDir();
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  async createFolder(name: string): Promise<void> {
    await this.ensureRootExists();
    const target = this.resolvePath(name);
    try {
      await fs.mkdir(target);
    } catch (err: unknown) {
      if (this.isNodeError(err) && err.code === 'EEXIST') {
        throw new ConflictException('Pasta já existe.');
      }
      throw err;
    }
  }

  async createFolderAt(
    parentPath: string | undefined,
    name: string,
  ): Promise<void> {
    await this.ensureRootExists();
    const rel = this.joinRelPath(parentPath ?? '', name);
    const target = this.resolvePath(rel);
    try {
      await fs.mkdir(target);
    } catch (err: unknown) {
      if (this.isNodeError(err) && err.code === 'EEXIST') {
        throw new ConflictException('Pasta já existe.');
      }
      throw err;
    }
  }

  async renameFolder(oldName: string, newName: string): Promise<void> {
    await this.ensureRootExists();
    const from = this.resolvePath(oldName);
    const to = this.resolvePath(newName);
    try {
      await fs.rename(from, to);
    } catch (err: unknown) {
      if (this.isNodeError(err) && err.code === 'ENOENT') {
        throw new NotFoundException('Pasta não encontrada.');
      }
      if (this.isNodeError(err) && err.code === 'EEXIST') {
        throw new ConflictException('Já existe uma pasta com esse nome.');
      }
      throw err;
    }
  }

  async renameFolderAt(relPath: string, newName: string): Promise<void> {
    await this.ensureRootExists();
    const safeRel = this.normalizeRelPath(relPath);
    const parent = path.dirname(safeRel);
    const parentRel = parent === '.' ? '' : parent;
    const toRel = this.joinRelPath(parentRel, newName);

    const from = this.resolvePath(safeRel);
    const to = this.resolvePath(toRel);
    try {
      await fs.rename(from, to);
    } catch (err: unknown) {
      if (this.isNodeError(err) && err.code === 'ENOENT') {
        throw new NotFoundException('Pasta não encontrada.');
      }
      if (this.isNodeError(err) && err.code === 'EEXIST') {
        throw new ConflictException('Já existe uma pasta com esse nome.');
      }
      throw err;
    }
  }

  async deleteFolder(name: string): Promise<void> {
    await this.ensureRootExists();
    const target = this.resolvePath(name);
    try {
      await fs.rm(target, { recursive: true, force: false });
    } catch (err: unknown) {
      if (this.isNodeError(err) && err.code === 'ENOENT') {
        throw new NotFoundException('Pasta não encontrada.');
      }
      throw err;
    }
  }

  private isNodeError(err: unknown): err is NodeJS.ErrnoException {
    return typeof err === 'object' && err !== null && 'code' in err;
  }

  async saveImages(input: {
    relPath: string;
    files: Array<{ buffer: Buffer; originalname: string }>;
    desiredNames?: string[];
  }): Promise<{ saved: string[] }> {
    await this.ensureRootExists();
    const safeRel = this.normalizeRelPath(input.relPath);
    const dirAbs = this.resolvePath(safeRel);
    await fs.mkdir(dirAbs, { recursive: true });

    const saved: string[] = [];
    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      const desired =
        input.desiredNames?.[i]?.trim() || file.originalname || 'arquivo';
      const cleaned = this.sanitizeFilename(desired);
      const { abs, finalName } = await this.getAvailableFilePath(
        dirAbs,
        cleaned,
      );
      await fs.writeFile(abs, file.buffer);
      saved.push(finalName);
    }

    return { saved };
  }

  async search(
    query: string,
  ): Promise<{ folders: FolderCard[]; files: FileCard[] }> {
    await this.ensureRootExists();
    const q = query.trim().toLowerCase();
    if (!q) return { folders: [], files: [] };

    const folders: FolderCard[] = [];
    const files: FileCard[] = [];

    const maxDepth = 6;
    const maxFolders = 60;
    const maxFiles = 240;

    const walk = async (relDir: string, depth: number): Promise<void> => {
      if (depth > maxDepth) return;
      if (folders.length >= maxFolders && files.length >= maxFiles) return;

      const dirAbs = this.resolvePath(relDir);
      const entries = await fs.readdir(dirAbs, { withFileTypes: true });

      for (const entry of entries) {
        if (folders.length >= maxFolders && files.length >= maxFiles) return;
        if (entry.isSymbolicLink()) continue;

        const name = entry.name;
        const nameLower = name.toLowerCase();
        const childRel = this.joinRelPath(relDir, name);

        if (entry.isDirectory()) {
          if (folders.length < maxFolders && nameLower.includes(q)) {
            const previewInfo = await this.getPreview(childRel);
            folders.push({
              name,
              path: this.toUrlPath(childRel),
              preview: previewInfo.preview,
              counts: previewInfo.counts,
            });
          }
          await walk(childRel, depth + 1);
          continue;
        }

        if (entry.isFile()) {
          if (files.length < maxFiles && nameLower.includes(q)) {
            const abs = path.join(dirAbs, name);
            const stat = await fs.stat(abs);
            files.push({
              name,
              path: this.toUrlPath(childRel),
              size: stat.size,
              updatedAt: stat.mtimeMs,
              isImage: this.isImageFilename(name),
            });
          }
        }
      }
    };

    await walk('', 0);

    folders.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    files.sort((a, b) => b.updatedAt - a.updatedAt);
    return { folders, files };
  }
}
