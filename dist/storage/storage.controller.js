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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const create_folder_dto_1 = require("./dto/create-folder.dto");
const rename_folder_dto_1 = require("./dto/rename-folder.dto");
const storage_service_1 = require("./storage.service");
const multer_1 = require("multer");
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const pdf_lib_1 = require("pdf-lib");
const sharp_1 = __importDefault(require("sharp"));
let StorageController = class StorageController {
    storageService;
    constructor(storageService) {
        this.storageService = storageService;
    }
    async list(relPath) {
        const data = await this.storageService.listFolderCards(relPath ?? '');
        return data;
    }
    async create(dto) {
        await this.storageService.createFolderAt(dto.parentPath, dto.name);
        return { ok: true };
    }
    async listFiles(relPath) {
        return this.storageService.listFiles(relPath ?? '');
    }
    async search(query) {
        const q = (query ?? '').trim();
        if (!q) {
            return { folders: [], files: [] };
        }
        return this.storageService.search(q);
    }
    async viewFile(filePath, res) {
        if (typeof filePath !== 'string' || filePath.trim() === '') {
            throw new common_1.BadRequestException('path é obrigatório.');
        }
        const file = await this.storageService.getFileForRead(filePath);
        res.setHeader('Content-Length', String(file.size));
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', this.getContentType(file.filename, file.isImage));
        (0, node_fs_1.createReadStream)(file.absPath).pipe(res);
    }
    async downloadFile(filePath, res) {
        if (typeof filePath !== 'string' || filePath.trim() === '') {
            throw new common_1.BadRequestException('path é obrigatório.');
        }
        const file = await this.storageService.getFileForRead(filePath);
        if (file.isImage) {
            const pdf = await this.buildA4PdfFromImage(file.absPath, file.filename);
            const downloadName = this.replaceExtension(file.filename, '.pdf');
            res.setHeader('Content-Length', String(pdf.length));
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${this.encodeRFC5987(downloadName)}`);
            res.setHeader('Content-Type', 'application/pdf');
            res.end(Buffer.from(pdf));
            return;
        }
        res.setHeader('Content-Length', String(file.size));
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${this.encodeRFC5987(file.filename)}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        (0, node_fs_1.createReadStream)(file.absPath).pipe(res);
    }
    async deleteFile(filePath) {
        if (typeof filePath !== 'string' || filePath.trim() === '') {
            throw new common_1.BadRequestException('path é obrigatório.');
        }
        await this.storageService.deleteFile(filePath);
        return { ok: true };
    }
    async upload(files, body) {
        if (!Array.isArray(files)) {
            throw new common_1.BadRequestException('Arquivos inválidos.');
        }
        const normalizedFiles = files.map((f) => {
            if (typeof f !== 'object' || f === null) {
                throw new common_1.BadRequestException('Arquivo inválido.');
            }
            if (!('buffer' in f) || !('originalname' in f) || !('mimetype' in f)) {
                throw new common_1.BadRequestException('Arquivo inválido.');
            }
            const buffer = f.buffer;
            const originalname = f.originalname;
            const mimetype = f.mimetype;
            if (!Buffer.isBuffer(buffer)) {
                throw new common_1.BadRequestException('Arquivo inválido.');
            }
            if (typeof originalname !== 'string' || originalname.trim() === '') {
                throw new common_1.BadRequestException('Arquivo inválido.');
            }
            if (typeof mimetype !== 'string' || !mimetype.startsWith('image/')) {
                throw new common_1.BadRequestException('Apenas imagens são permitidas.');
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
    async renameDeep(dto) {
        if (!dto.path) {
            throw new common_1.BadRequestException('path é obrigatório.');
        }
        await this.storageService.renameFolderAt(dto.path, dto.newName);
        return { ok: true };
    }
    async rename(name, dto) {
        await this.storageService.renameFolder(name, dto.newName);
        return { ok: true };
    }
    async remove(name) {
        await this.storageService.deleteFolder(name);
        return { ok: true };
    }
    getContentType(filename, isImage) {
        if (!isImage)
            return 'application/octet-stream';
        const ext = path.extname(filename).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg')
            return 'image/jpeg';
        if (ext === '.png')
            return 'image/png';
        if (ext === '.gif')
            return 'image/gif';
        if (ext === '.webp')
            return 'image/webp';
        return 'application/octet-stream';
    }
    replaceExtension(filename, newExt) {
        const ext = path.extname(filename);
        if (!ext)
            return filename + newExt;
        return filename.slice(0, -ext.length) + newExt;
    }
    async buildA4PdfFromImage(absPath, filename) {
        const ext = path.extname(filename).toLowerCase();
        if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
            throw new common_1.BadRequestException('Formato de imagem não suportado para PDF. Use JPG ou PNG.');
        }
        const input = (0, sharp_1.default)(absPath).rotate();
        const meta = await input.metadata();
        if (!meta.width || !meta.height) {
            throw new common_1.BadRequestException('Não foi possível ler a imagem.');
        }
        const isLandscape = meta.width > meta.height;
        const pageWidth = isLandscape ? 841.89 : 595.28;
        const pageHeight = isLandscape ? 595.28 : 841.89;
        const targetWidthPx = isLandscape ? 3508 : 2480;
        const targetHeightPx = isLandscape ? 2480 : 3508;
        const rendered = await (0, sharp_1.default)(absPath)
            .rotate()
            .resize(targetWidthPx, targetHeightPx, {
            fit: 'cover',
            position: 'centre',
        })
            .flatten({ background: '#ffffff' })
            .png()
            .toBuffer();
        const pdf = await pdf_lib_1.PDFDocument.create();
        const page = pdf.addPage([pageWidth, pageHeight]);
        const image = await pdf.embedPng(rendered);
        page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
        return pdf.save();
    }
    encodeRFC5987(value) {
        return encodeURIComponent(value)
            .replaceAll("'", '%27')
            .replaceAll('(', '%28')
            .replaceAll(')', '%29')
            .replaceAll('*', '%2A');
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_folder_dto_1.CreateFolderDto]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('files'),
    __param(0, (0, common_1.Query)('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "listFiles", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('query')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('file/view'),
    __param(0, (0, common_1.Query)('path')),
    __param(1, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "viewFile", null);
__decorate([
    (0, common_1.Get)('file/download'),
    __param(0, (0, common_1.Query)('path')),
    __param(1, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "downloadFile", null);
__decorate([
    (0, common_1.Delete)('file'),
    __param(0, (0, common_1.Query)('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "deleteFile", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 20, {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 15 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "upload", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [rename_folder_dto_1.RenameFolderDto]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "renameDeep", null);
__decorate([
    (0, common_1.Patch)(':name'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, rename_folder_dto_1.RenameFolderDto]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "rename", null);
__decorate([
    (0, common_1.Delete)(':name'),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "remove", null);
exports.StorageController = StorageController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/folders'),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], StorageController);
//# sourceMappingURL=storage.controller.js.map