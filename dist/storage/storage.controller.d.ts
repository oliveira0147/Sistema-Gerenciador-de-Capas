import type { Response } from 'express';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameFolderDto } from './dto/rename-folder.dto';
import { StorageService } from './storage.service';
export declare class StorageController {
    private readonly storageService;
    constructor(storageService: StorageService);
    list(relPath?: string): Promise<{
        path: string;
        breadcrumbs: {
            name: string;
            path: string;
        }[];
        folders: {
            name: string;
            path: string;
            preview: ({
                kind: "folder";
                name: string;
            } | {
                kind: "file";
                name: string;
                path: string;
                isImage: boolean;
            })[];
            counts: {
                folders: number;
                files: number;
            };
        }[];
    }>;
    create(dto: CreateFolderDto): Promise<{
        ok: boolean;
    }>;
    listFiles(relPath?: string): Promise<{
        path: string;
        files: {
            name: string;
            path: string;
            size: number;
            updatedAt: number;
            isImage: boolean;
        }[];
    }>;
    search(query?: string): Promise<{
        folders: {
            name: string;
            path: string;
            preview: ({
                kind: "folder";
                name: string;
            } | {
                kind: "file";
                name: string;
                path: string;
                isImage: boolean;
            })[];
            counts: {
                folders: number;
                files: number;
            };
        }[];
        files: {
            name: string;
            path: string;
            size: number;
            updatedAt: number;
            isImage: boolean;
        }[];
    }>;
    viewFile(filePath: string, res: Response): Promise<void>;
    downloadFile(filePath: string, res: Response): Promise<void>;
    deleteFile(filePath: string): Promise<{
        ok: boolean;
    }>;
    upload(files: unknown, body: {
        path?: string;
        names?: string | string[];
    }): Promise<{
        ok: boolean;
        saved: string[];
    }>;
    renameDeep(dto: RenameFolderDto): Promise<{
        ok: boolean;
    }>;
    rename(name: string, dto: RenameFolderDto): Promise<{
        ok: boolean;
    }>;
    remove(name: string): Promise<{
        ok: boolean;
    }>;
    private getContentType;
    private replaceExtension;
    private buildA4PdfFromImage;
    private encodeRFC5987;
}
