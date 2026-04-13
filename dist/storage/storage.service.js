"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_fs_1 = require("node:fs");
const node_fs_2 = require("node:fs");
const path = __importStar(require("node:path"));
let StorageService = class StorageService {
    config;
    constructor(config) {
        this.config = config;
    }
    getRootDir() {
        const raw = this.config.getOrThrow('STORAGE_ROOT');
        return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
    }
    async ensureRootExists() {
        const root = this.getRootDir();
        await node_fs_1.promises.mkdir(root, { recursive: true });
        (0, node_fs_2.accessSync)(root, node_fs_1.constants.R_OK | node_fs_1.constants.W_OK);
    }
    normalizeRelPath(relPath) {
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
    resolvePath(relPath) {
        const root = this.getRootDir();
        const normalized = this.normalizeRelPath(relPath);
        const target = path.resolve(root, normalized);
        const rootResolved = path.resolve(root);
        if ((normalized !== '' && target === rootResolved) ||
            !(target === rootResolved || target.startsWith(rootResolved + path.sep))) {
            throw new common_1.ConflictException('Nome de pasta inválido.');
        }
        return target;
    }
    joinRelPath(parent, name) {
        const p = this.normalizeRelPath(parent);
        const child = name.trim();
        if (!p)
            return child;
        return path.join(p, child);
    }
    toUrlPath(relPath) {
        return relPath.split(path.sep).join('/');
    }
    fromUrlPath(relPath) {
        return relPath.replaceAll('\\', '/').split('/').join(path.sep);
    }
    isImageFilename(filename) {
        const ext = path.extname(filename).toLowerCase();
        return (ext === '.jpg' ||
            ext === '.jpeg' ||
            ext === '.png' ||
            ext === '.gif' ||
            ext === '.webp');
    }
    async listFiles(relDir) {
        await this.ensureRootExists();
        const safeRel = this.normalizeRelPath(relDir);
        const dirAbs = this.resolvePath(safeRel);
        const entries = await node_fs_1.promises.readdir(dirAbs, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
            if (!entry.isFile())
                continue;
            const abs = path.join(dirAbs, entry.name);
            const stat = await node_fs_1.promises.stat(abs);
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
    async getFileForRead(relFilePath) {
        await this.ensureRootExists();
        const safeRel = this.normalizeRelPath(this.fromUrlPath(relFilePath));
        const abs = this.resolvePath(safeRel);
        const stat = await node_fs_1.promises.stat(abs).catch((err) => {
            if (this.isNodeError(err) && err.code === 'ENOENT') {
                throw new common_1.NotFoundException('Arquivo não encontrado.');
            }
            throw err;
        });
        if (!stat.isFile()) {
            throw new common_1.NotFoundException('Arquivo não encontrado.');
        }
        const filename = path.basename(abs);
        return {
            absPath: abs,
            filename,
            size: stat.size,
            isImage: this.isImageFilename(filename),
        };
    }
    async deleteFile(relFilePath) {
        await this.ensureRootExists();
        const safeRel = this.normalizeRelPath(this.fromUrlPath(relFilePath));
        const abs = this.resolvePath(safeRel);
        const stat = await node_fs_1.promises.stat(abs).catch((err) => {
            if (this.isNodeError(err) && err.code === 'ENOENT') {
                throw new common_1.NotFoundException('Arquivo não encontrado.');
            }
            throw err;
        });
        if (!stat.isFile()) {
            throw new common_1.NotFoundException('Arquivo não encontrado.');
        }
        await node_fs_1.promises.unlink(abs).catch((err) => {
            if (this.isNodeError(err) && err.code === 'ENOENT') {
                throw new common_1.NotFoundException('Arquivo não encontrado.');
            }
            throw err;
        });
    }
    sanitizeFilename(filename) {
        const trimmed = filename.trim();
        const withoutSeparators = trimmed
            .replaceAll('\\', '_')
            .replaceAll('/', '_');
        let withoutControl = '';
        for (const ch of withoutSeparators) {
            const code = ch.codePointAt(0);
            if (code === undefined)
                continue;
            if (code < 32)
                continue;
            if (code === 127)
                continue;
            withoutControl += ch;
        }
        const cleaned = withoutControl.trim();
        if (cleaned === '' || cleaned === '.' || cleaned === '..') {
            throw new common_1.ConflictException('Nome de arquivo inválido.');
        }
        if (cleaned.length > 255) {
            throw new common_1.ConflictException('Nome de arquivo muito grande.');
        }
        return cleaned;
    }
    async getAvailableFilePath(dirAbs, filename) {
        const base = path.basename(filename);
        const ext = path.extname(base);
        const nameWithoutExt = ext ? base.slice(0, -ext.length) : base;
        let candidate = base;
        for (let i = 0; i < 2000; i++) {
            const abs = path.join(dirAbs, candidate);
            try {
                await node_fs_1.promises.access(abs);
            }
            catch {
                return { abs, finalName: candidate };
            }
            candidate = `${nameWithoutExt} (${i + 1})${ext}`;
        }
        throw new common_1.ConflictException('Não foi possível gerar um nome único.');
    }
    async listFolderCards(relPath) {
        await this.ensureRootExists();
        const safeRel = this.normalizeRelPath(relPath);
        const dir = this.resolvePath(safeRel);
        const entries = await node_fs_1.promises.readdir(dir, { withFileTypes: true });
        const folders = [];
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
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
        const breadcrumbs = [
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
    async getPreview(relPath) {
        const abs = this.resolvePath(relPath);
        const entries = await node_fs_1.promises.readdir(abs, { withFileTypes: true });
        let folders = 0;
        let files = 0;
        const preview = [];
        const sorted = [...entries].sort((a, b) => {
            const aDir = a.isDirectory() ? 0 : 1;
            const bDir = b.isDirectory() ? 0 : 1;
            if (aDir !== bDir)
                return aDir - bDir;
            return a.name.localeCompare(b.name, 'pt-BR');
        });
        for (const e of sorted) {
            if (e.isDirectory())
                folders++;
            else if (e.isFile())
                files++;
            if (preview.length >= 4)
                continue;
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
    async listFolders() {
        await this.ensureRootExists();
        const root = this.getRootDir();
        const entries = await node_fs_1.promises.readdir(root, { withFileTypes: true });
        return entries
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    async createFolder(name) {
        await this.ensureRootExists();
        const target = this.resolvePath(name);
        try {
            await node_fs_1.promises.mkdir(target);
        }
        catch (err) {
            if (this.isNodeError(err) && err.code === 'EEXIST') {
                throw new common_1.ConflictException('Pasta já existe.');
            }
            throw err;
        }
    }
    async createFolderAt(parentPath, name) {
        await this.ensureRootExists();
        const rel = this.joinRelPath(parentPath ?? '', name);
        const target = this.resolvePath(rel);
        try {
            await node_fs_1.promises.mkdir(target);
        }
        catch (err) {
            if (this.isNodeError(err) && err.code === 'EEXIST') {
                throw new common_1.ConflictException('Pasta já existe.');
            }
            throw err;
        }
    }
    async renameFolder(oldName, newName) {
        await this.ensureRootExists();
        const from = this.resolvePath(oldName);
        const to = this.resolvePath(newName);
        try {
            await node_fs_1.promises.rename(from, to);
        }
        catch (err) {
            if (this.isNodeError(err) && err.code === 'ENOENT') {
                throw new common_1.NotFoundException('Pasta não encontrada.');
            }
            if (this.isNodeError(err) && err.code === 'EEXIST') {
                throw new common_1.ConflictException('Já existe uma pasta com esse nome.');
            }
            throw err;
        }
    }
    async renameFolderAt(relPath, newName) {
        await this.ensureRootExists();
        const safeRel = this.normalizeRelPath(relPath);
        const parent = path.dirname(safeRel);
        const parentRel = parent === '.' ? '' : parent;
        const toRel = this.joinRelPath(parentRel, newName);
        const from = this.resolvePath(safeRel);
        const to = this.resolvePath(toRel);
        try {
            await node_fs_1.promises.rename(from, to);
        }
        catch (err) {
            if (this.isNodeError(err) && err.code === 'ENOENT') {
                throw new common_1.NotFoundException('Pasta não encontrada.');
            }
            if (this.isNodeError(err) && err.code === 'EEXIST') {
                throw new common_1.ConflictException('Já existe uma pasta com esse nome.');
            }
            throw err;
        }
    }
    async deleteFolder(name) {
        await this.ensureRootExists();
        const target = this.resolvePath(name);
        try {
            await node_fs_1.promises.rm(target, { recursive: true, force: false });
        }
        catch (err) {
            if (this.isNodeError(err) && err.code === 'ENOENT') {
                throw new common_1.NotFoundException('Pasta não encontrada.');
            }
            throw err;
        }
    }
    isNodeError(err) {
        return typeof err === 'object' && err !== null && 'code' in err;
    }
    async saveImages(input) {
        await this.ensureRootExists();
        const safeRel = this.normalizeRelPath(input.relPath);
        const dirAbs = this.resolvePath(safeRel);
        await node_fs_1.promises.mkdir(dirAbs, { recursive: true });
        const saved = [];
        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            const desired = input.desiredNames?.[i]?.trim() || file.originalname || 'arquivo';
            const cleaned = this.sanitizeFilename(desired);
            const { abs, finalName } = await this.getAvailableFilePath(dirAbs, cleaned);
            await node_fs_1.promises.writeFile(abs, file.buffer);
            saved.push(finalName);
        }
        return { saved };
    }
    async search(query) {
        await this.ensureRootExists();
        const q = query.trim().toLowerCase();
        if (!q)
            return { folders: [], files: [] };
        const folders = [];
        const files = [];
        const maxDepth = 6;
        const maxFolders = 60;
        const maxFiles = 240;
        const walk = async (relDir, depth) => {
            if (depth > maxDepth)
                return;
            if (folders.length >= maxFolders && files.length >= maxFiles)
                return;
            const dirAbs = this.resolvePath(relDir);
            const entries = await node_fs_1.promises.readdir(dirAbs, { withFileTypes: true });
            for (const entry of entries) {
                if (folders.length >= maxFolders && files.length >= maxFiles)
                    return;
                if (entry.isSymbolicLink())
                    continue;
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
                        const stat = await node_fs_1.promises.stat(abs);
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
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map