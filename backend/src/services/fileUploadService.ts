import { fileStorageService, FileUploadOptions, FileCategory } from './fileStorageService';
import { fileSecurityService } from './fileSecurityService';
import logger from './loggerService';

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  fileId: string;
  securityScanStatus?: 'pending' | 'clean' | 'infected' | 'error';
}

export interface FileUploadResult {
  file: UploadedFile;
  success: boolean;
  message?: string;
  violations?: string[];
}

/**
 * Enhanced file upload service that integrates security policies and virus scanning
 */
export class FileUploadService {
  /**
   * Upload a file with security validation and virus scanning
   * 
   * @param fileBuffer The buffer of the file to upload
   * @param originalName Original filename
   * @param mimeType The MIME type of the file
   * @param userId ID of the user uploading the file
   * @param category File category for storage organization
   * @param options Additional upload options
   * @param securityPolicyId Optional specific security policy to use
   * @returns Upload result with file information or validation errors
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
    category: FileCategory,
    options: Partial<FileUploadOptions> = {},
    securityPolicyId?: string
  ): Promise<FileUploadResult> {
    try {
      // Validate inputs
      if (!fileBuffer) {
        return {
          file: this.createEmptyFile(),
          success: false,
          message: 'File buffer is null or undefined'
        };
      }
      
      if (!originalName) {
        originalName = `file-${Date.now()}${this.getDefaultExtension(mimeType)}`;
      }
      
      if (!mimeType) {
        mimeType = 'application/octet-stream';
      }

      logger.info(`Processing file upload: ${originalName} (${fileBuffer.length} bytes, ${mimeType})`);

      // Validate file against security policies
      const validation = await fileSecurityService.validateFile(
        originalName,
        mimeType,
        fileBuffer.length,
        securityPolicyId
      );

      if (!validation.valid) {
        logger.warn(`File validation failed for ${originalName}: ${validation.violations.join(', ')}`);
        return {
          file: this.createEmptyFile(),
          success: false,
          message: 'File validation failed',
          violations: validation.violations
        };
      }

      // Perform virus scan if required by policy
      const scanResult = await fileSecurityService.scanFile(
        `temp_${Date.now()}`,
        fileBuffer,
        originalName
      );

      if (scanResult.status === 'infected' || scanResult.status === 'quarantined') {
        logger.warn(`Security scan detected threats in file ${originalName}: ${scanResult.threats.join(', ')}`);
        return {
          file: this.createEmptyFile(),
          success: false,
          message: 'File contains malicious content',
          violations: scanResult.threats
        };
      }

      // Prepare upload options
      const uploadOptions: FileUploadOptions = {
        category,
        isPublic: options.isPublic !== false,
        accessLevel: options.accessLevel || 'authenticated',
        ...options
      };

      // Upload file to storage
      const fileMetadata = await fileStorageService.uploadFile(
        fileBuffer,
        originalName,
        userId,
        uploadOptions,
        (options as any).contextId
      );

      // Return success result
      const result: FileUploadResult = {
        file: {
          fileName: fileMetadata.originalName,
          fileUrl: fileMetadata.url,
          fileType: fileMetadata.mimeType,
          fileSize: fileMetadata.size,
          fileId: fileMetadata.id,
          securityScanStatus: scanResult.status
        },
        success: true,
        message: 'File uploaded successfully'
      };

      logger.info(`File uploaded successfully: ${fileMetadata.id} (${originalName})`);
      return result;

    } catch (error) {
      logger.error(`Error uploading file ${originalName}:`, error);
      return {
        file: this.createEmptyFile(),
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during file upload'
      };
    }
  }

  /**
   * Upload multiple files with security validation
   * 
   * @param files Array of file objects with buffer, name, and type
   * @param userId ID of the user uploading the files
   * @param category File category for storage organization
   * @param options Additional upload options
   * @param securityPolicyId Optional specific security policy to use
   * @returns Array of upload results for each file
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; originalName: string; mimeType: string }>,
    userId: string,
    category: FileCategory,
    options: Partial<FileUploadOptions> = {},
    securityPolicyId?: string
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(
        file.buffer,
        file.originalName,
        file.mimeType,
        userId,
        category,
        options,
        securityPolicyId
      );
      
      results.push(result);
    }

    return results;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use uploadFile instead
   */
  async uploadFileToFirebase(
    fileBuffer: Buffer,
    mimetype: string,
    folder: string
  ): Promise<string> {
    try {
      const result = await this.uploadFile(
        fileBuffer,
        `file-${Date.now()}${this.getDefaultExtension(mimetype)}`,
        mimetype,
        'system',
        this.folderToCategory(folder),
        { isPublic: true }
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.file.fileUrl;
    } catch (error) {
      logger.error('Error in legacy uploadFileToFirebase:', error);
      throw error;
    }
  }

  /**
   * Map legacy folder names to file categories
   */
  private folderToCategory(folder: string): FileCategory {
    const folderMap: Record<string, FileCategory> = {
      'prototypes': 'prototype_files',
      'avatars': 'profile_images',
      'posts': 'post_images',
      'sessions': 'session_materials',
      'marketplace': 'marketplace_images'
    };

    return folderMap[folder] || 'temp_files';
  }

  /**
   * Get default file extension based on MIME type
   */
  private getDefaultExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/zip': '.zip'
    };

    return mimeMap[mimeType] || '';
  }

  /**
   * Create empty file object for error responses
   */
  private createEmptyFile(): UploadedFile {
    return {
      fileName: '',
      fileUrl: '',
      fileType: '',
      fileSize: 0,
      fileId: ''
    };
  }
}

export const fileUploadService = new FileUploadService();
export default fileUploadService; 