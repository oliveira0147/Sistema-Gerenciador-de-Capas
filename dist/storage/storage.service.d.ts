import { ConfigService } from '@nestjs/config';
type FolderCard = {
    name: string;
    path: string;
    preview: FolderPreviewItem[];
    counts: {
        folders: number;
        files: number;
    };
};
type FolderPreviewItem = {
    kind: 'folder';
    name: string;
} | {
    kind: 'file';
    name: string;
    path: string;
    isImage: boolean;
};
type FileCard = {
    name: string;
    path: string;
    size: number;
    updatedAt: number;
    isImage: boolean;
};
export declare class StorageService {
    private readonly config;
    constructor(config: ConfigService);
    private getRootDir;
    private ensureRootExists;
    private normalizeRelPath;
    private resolvePath;
    private joinRelPath;
    private toUrlPath;
    private fromUrlPath;
    private isImageFilename;
    listFiles(relDir: string): Promise<{
        path: string;
        files: FileCard[];
    }>;
    getFileForRead(relFilePath: string): Promise<{
        absPath: string;
        filename: string;
        size: number;
        isImage: boolean;
    }>;
    deleteFile(relFilePath: string): Promise<void>;
    private sanitizeFilename;
    private getAvailableFilePath;
    listFolderCards(relPath: string): Promise<{
        path: string;
        breadcrumbs: {
            name: string;
            path: string;
        }[];
        folders: FolderCard[];
    }>;
    private getPreview;
    listFolders(): Promise<string[]>;
    createFolder(name: string): Promise<void>;
    createFolderAt(parentPath: string | undefined, name: string): Promise<void>;
    renameFolder(oldName: string, newName: string): Promise<void>;
    renameFolderAt(relPath: string, newName: string): Promise<void>;
    deleteFolder(name: string): Promise<void>;
    private isNodeError;
    saveImages(input: {
        relPath: string;
        files: Array<{
            buffer: Buffer;
            originalname: string;
        }>;
        desiredNames?: string[];
    }): Promise<{
        saved: string[];
    }>;
    search(query: string): Promise<{
        folders: FolderCard[];
        files: FileCard[];
    }>;
}
export {};
