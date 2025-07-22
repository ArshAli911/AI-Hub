import { storage } from '../config/firebaseAdmin';
import { firestore } from '../config/firebaseAdmin';
import logger from './loggerService';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileMetadata {
  id: string;
  originalName: string;
  storedName: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  category: FileCategory;
  subcategory?: string;
  tags?: string[];
  isPublic: boolean;
  accessLevel: 'public' | 'authenticated' | 'private' | 'restricted';
  allowedUsers?: string[];
  allowedRoles?: string[];
  expiresAt?: Date;
  downloadCount: number;
  lastAccessedAt?: Date;
  checksum: string;
  virus_scan?: {
    status: 'pending' | 'clean' | 'infected' | 'error';
    scannedAt?: Date;
    engine?: string;
    threats?: string[];
  };
}

export type FileCategory = 
  | 'profile_images' 
  | 'post_images' 
  | 'post_files' 
  | 'prototype_files' 
  | 'prototype_images' 
  | 'session_recordings' 
  | 'session_materials' 
  | 'marketplace_images' 
  | 'marketplace_files' 
  | 'system_assets' 
  | 'temp_files' 
  | 'backups';

export interface StorageQuota {
  userId: string;
  totalUsed: number;
  totalLimit: number;
  categoryLimits: Record<FileCategory, number>;
  categoryUsed: Record<FileCategory, number>;
  lastUpdated: Date;
}

export interface FileUploadOptions {
  category: FileCategory;
  subcategory?: string;
  tags?: string[];
  isPublic?: boolean;
  accessLevel?: FileMetadata['accessLevel'];
  allowedUsers?: string[];
  allowedRoles?: string[];
  expiresAt?: Date;
  generateThumbnails?: boolean;
  processImage?: boolean;
  processVideo?: boolean;
}

export class FileStorageService {
  private bucket = storage.bucket();
  
  // Storage path structure
  private readonly pathStructure: Record<FileCategory, string> = {
    profile_images: 'users/{userId}/profile',
    post_images: 'community/posts/{postId}/images',
    post_files: 'community/posts/{postId}/files',
    prototype_files: 'prototypes/{prototypeId}/files',
    prototype_images: 'prototypes/{prototypeId}/images',
    session_recordings: 'sessions/{sessionId}/recordings',
    session_materials: 'sessions/{sessionId}/materials',
    marketplace_images: 'marketplace/{productId}/images',
    marketplace_files: 'marketplace/{productId}/files',
    system_assets: 'system/assets',
    temp_files: 'temp/{userId}',
    backups: 'backups/{date}'
  };

  // Default quota limits (in bytes)
  private readonly defaultQuotas: Record<FileCategory, number> = {
    profile_images: 10 * 1024 * 1024, // 10MB
    post_images: 50 * 1024 * 1024, // 50MB
    post_files: 100 * 1024 * 1024, // 100MB
    prototype_files: 500 * 1024 * 1024, // 500MB
    prototype_images: 100 * 1024 * 1024, // 100MB
    session_recordings: 1024 * 1024 * 1024, // 1GB
    session_materials: 200 * 1024 * 1024, // 200MB
    marketplace_images: 100 * 1024 * 1024, // 100MB
    marketplace_files: 200 * 1024 * 1024, // 200MB
    system_assets: 1024 * 1024 * 1024, // 1GB
    temp_files: 50 * 1024 * 1024, // 50MB
    backups: 10 * 1024 * 1024 * 1024 // 10GB
  };

  /**
   * Upload file with proper organization and metadata
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    uploadedBy: string,
    options: FileUploadOptions,
    contextId?: string
  ): Promise<FileMetadata> {
    try {
      // Check quota before upload
      await this.checkQuota(uploadedBy, options.category, fileBuffer.length);

      // Generate file ID and storage path
      const fileId = uuidv4();
      const storedName = this.generateStoredName(originalName, fileId);
      const storagePath = this.generateStoragePath(options.category, uploadedBy, contextId, storedName);

      // Calculate checksum
      const checksum = this.calculateChecksum(fileBuffer);

      // Check for duplicate files
      const existingFile = await this.findFileByChecksum(checksum, uploadedBy);
      if (existingFile) {
        logger.info(`Duplicate file detected, returning existing file: ${existingFile.id}`);
        return existingFile;
      }

      // Upload to Firebase Storage
      const file = this.bucket.file(storagePath);
      await file.save(fileBuffer, {
        metadata: {
          contentType: this.getMimeType(originalName),
          metadata: {
            uploadedBy,
            category: options.category,
            originalName,
            fileId
          }
        }
      });

      // Set access permissions
      if (options.isPublic !== false && options.accessLevel !== 'private') {
        await file.makePublic();
      }

      // Get public URL
      const url = options.isPublic !== false ? file.publicUrl() : await this.getSignedUrl(storagePath);

      // Create file metadata
      const metadata: FileMetadata = {
        id: fileId,
        originalName,
        storedName,
        path: storagePath,
        url,
        size: fileBuffer.length,
        mimeType: this.getMimeType(originalName),
        uploadedBy,
        uploadedAt: new Date(),
        category: options.category,
        subcategory: options.subcategory,
        tags: options.tags || [],
        isPublic: options.isPublic !== false,
        accessLevel: options.accessLevel || 'authenticated',
        allowedUsers: options.allowedUsers,
        allowedRoles: options.allowedRoles,
        expiresAt: options.expiresAt,
        downloadCount: 0,
        checksum,
        virus_scan: {
          status: 'pending'
        }
      };

      // Store metadata in Firestore
      await firestore.collection('fileMetadata').doc(fileId).set(metadata);

      // Update user quota
      await this.updateQuota(uploadedBy, options.category, fileBuffer.length);

      // Schedule virus scan
      await this.scheduleVirusScan(fileId);

      logger.info(`File uploaded successfully: ${fileId} (${originalName})`);
      return metadata;

    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const doc = await firestore.collection('fileMetadata').doc(fileId).get();
      
      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as FileMetadata;
    } catch (error) {
      logger.error(`Error getting file metadata ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Download file with access control
   */
  async downloadFile(fileId: string, userId: string): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    try {
      const metadata = await this.getFileMetadata(fileId);
      
      if (!metadata) {
        throw new Error('File not found');
      }

      // Check access permissions
      if (!await this.checkFileAccess(metadata, userId)) {
        throw new Error('Access denied');
      }

      // Check if file is expired
      if (metadata.expiresAt && metadata.expiresAt < new Date()) {
        throw new Error('File has expired');
      }

      // Download from storage
      const file = this.bucket.file(metadata.path);
      const [buffer] = await file.download();

      // Update access statistics
      await this.updateFileAccess(fileId);

      return { buffer, metadata };
    } catch (error) {
      logger.error(`Error downloading file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Delete file and cleanup
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      const metadata = await this.getFileMetadata(fileId);
      
      if (!metadata) {
        throw new Error('File not found');
      }

      // Check if user can delete file
      if (metadata.uploadedBy !== userId && !await this.isUserAdmin(userId)) {
        throw new Error('Permission denied');
      }

      // Delete from storage
      const file = this.bucket.file(metadata.path);
      await file.delete();

      // Delete metadata
      await firestore.collection('fileMetadata').doc(fileId).delete();

      // Update quota
      await this.updateQuota(metadata.uploadedBy, metadata.category, -metadata.size);

      logger.info(`File deleted: ${fileId}`);
    } catch (error) {
      logger.error(`Error deleting file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get user files with pagination
   */
  async getUserFiles(
    userId: string,
    category?: FileCategory,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ files: FileMetadata[]; total: number }> {
    try {
      let query = firestore.collection('fileMetadata')
        .where('uploadedBy', '==', userId);

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query
        .orderBy('uploadedAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const files = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FileMetadata[];

      // Get total count
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      return { files, total };
    } catch (error) {
      logger.error(`Error getting user files for ${userId}:`, error);
      return { files: [], total: 0 };
    }
  }

  /**
   * Get user storage quota
   */
  async getUserQuota(userId: string): Promise<StorageQuota> {
    try {
      const doc = await firestore.collection('storageQuotas').doc(userId).get();
      
      if (!doc.exists) {
        // Create default quota
        const defaultQuota: StorageQuota = {
          userId,
          totalUsed: 0,
          totalLimit: Object.values(this.defaultQuotas).reduce((sum, limit) => sum + limit, 0),
          categoryLimits: { ...this.defaultQuotas },
          categoryUsed: Object.keys(this.defaultQuotas).reduce((acc, key) => {
            acc[key as FileCategory] = 0;
            return acc;
          }, {} as Record<FileCategory, number>),
          lastUpdated: new Date()
        };

        await firestore.collection('storageQuotas').doc(userId).set(defaultQuota);
        return defaultQuota;
      }

      return { userId, ...doc.data() } as StorageQuota;
    } catch (error) {
      logger.error(`Error getting quota for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up expired files
   */
  async cleanupExpiredFiles(): Promise<number> {
    try {
      const now = new Date();
      const expiredFilesSnapshot = await firestore
        .collection('fileMetadata')
        .where('expiresAt', '<', now)
        .limit(100)
        .get();

      if (expiredFilesSnapshot.empty) {
        return 0;
      }

      const batch = firestore.batch();
      const deletePromises: Promise<void>[] = [];

      for (const doc of expiredFilesSnapshot.docs) {
        const metadata = doc.data() as FileMetadata;
        
        // Delete from storage
        const file = this.bucket.file(metadata.path);
        deletePromises.push(file.delete().catch(err => 
          logger.warn(`Failed to delete expired file from storage: ${metadata.path}`, err)
        ));

        // Delete metadata
        batch.delete(doc.ref);

        // Update quota
        deletePromises.push(
          this.updateQuota(metadata.uploadedBy, metadata.category, -metadata.size)
            .catch(err => logger.warn(`Failed to update quota for expired file: ${metadata.id}`, err))
        );
      }

      await Promise.all([batch.commit(), ...deletePromises]);

      logger.info(`Cleaned up ${expiredFilesSnapshot.size} expired files`);
      return expiredFilesSnapshot.size;
    } catch (error) {
      logger.error('Error cleaning up expired files:', error);
      return 0;
    }
  }

  /**
   * Clean up temp files older than specified hours
   */
  async cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      
      const tempFilesSnapshot = await firestore
        .collection('fileMetadata')
        .where('category', '==', 'temp_files')
        .where('uploadedAt', '<', cutoffTime)
        .limit(100)
        .get();

      if (tempFilesSnapshot.empty) {
        return 0;
      }

      const batch = firestore.batch();
      const deletePromises: Promise<void>[] = [];

      for (const doc of tempFilesSnapshot.docs) {
        const metadata = doc.data() as FileMetadata;
        
        // Delete from storage
        const file = this.bucket.file(metadata.path);
        deletePromises.push(file.delete().catch(err => 
          logger.warn(`Failed to delete temp file from storage: ${metadata.path}`, err)
        ));

        // Delete metadata
        batch.delete(doc.ref);

        // Update quota
        deletePromises.push(
          this.updateQuota(metadata.uploadedBy, metadata.category, -metadata.size)
            .catch(err => logger.warn(`Failed to update quota for temp file: ${metadata.id}`, err))
        );
      }

      await Promise.all([batch.commit(), ...deletePromises]);

      logger.info(`Cleaned up ${tempFilesSnapshot.size} temp files`);
      return tempFilesSnapshot.size;
    } catch (error) {
      logger.error('Error cleaning up temp files:', error);
      return 0;
    }
  }

  /**
   * Generate storage path based on category and context
   */
  private generateStoragePath(
    category: FileCategory,
    userId: string,
    contextId?: string,
    fileName?: string
  ): string {
    let pathTemplate = this.pathStructure[category];
    
    // Replace placeholders
    pathTemplate = pathTemplate.replace('{userId}', userId);
    
    if (contextId) {
      pathTemplate = pathTemplate
        .replace('{postId}', contextId)
        .replace('{prototypeId}', contextId)
        .replace('{sessionId}', contextId)
        .replace('{productId}', contextId);
    }
    
    if (category === 'backups') {
      const date = new Date().toISOString().split('T')[0];
      pathTemplate = pathTemplate.replace('{date}', date);
    }
    
    return fileName ? `${pathTemplate}/${fileName}` : pathTemplate;
  }

  /**
   * Generate stored file name with timestamp and UUID
   */
  private generateStoredName(originalName: string, fileId: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    return `${timestamp}_${fileId}${ext}`;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Calculate file checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Find file by checksum to prevent duplicates
   */
  private async findFileByChecksum(checksum: string, userId: string): Promise<FileMetadata | null> {
    try {
      const snapshot = await firestore
        .collection('fileMetadata')
        .where('checksum', '==', checksum)
        .where('uploadedBy', '==', userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FileMetadata;
    } catch (error) {
      logger.error('Error finding file by checksum:', error);
      return null;
    }
  }

  /**
   * Check if user has quota for upload
   */
  private async checkQuota(userId: string, category: FileCategory, fileSize: number): Promise<void> {
    const quota = await this.getUserQuota(userId);
    
    if (quota.categoryUsed[category] + fileSize > quota.categoryLimits[category]) {
      throw new Error(`Category quota exceeded for ${category}`);
    }
    
    if (quota.totalUsed + fileSize > quota.totalLimit) {
      throw new Error('Total storage quota exceeded');
    }
  }

  /**
   * Update user quota
   */
  private async updateQuota(userId: string, category: FileCategory, sizeChange: number): Promise<void> {
    try {
      const quotaRef = firestore.collection('storageQuotas').doc(userId);
      
      await quotaRef.update({
        totalUsed: firestore.FieldValue.increment(sizeChange),
        [`categoryUsed.${category}`]: firestore.FieldValue.increment(sizeChange),
        lastUpdated: new Date()
      });
    } catch (error) {
      logger.error(`Error updating quota for user ${userId}:`, error);
    }
  }

  /**
   * Check file access permissions
   */
  private async checkFileAccess(metadata: FileMetadata, userId: string): Promise<boolean> {
    // Public files are accessible to everyone
    if (metadata.isPublic && metadata.accessLevel === 'public') {
      return true;
    }

    // Owner always has access
    if (metadata.uploadedBy === userId) {
      return true;
    }

    // Check specific user permissions
    if (metadata.allowedUsers && metadata.allowedUsers.includes(userId)) {
      return true;
    }

    // Check role-based permissions
    if (metadata.allowedRoles) {
      const userRole = await this.getUserRole(userId);
      if (userRole && metadata.allowedRoles.includes(userRole)) {
        return true;
      }
    }

    // Admin access
    if (await this.isUserAdmin(userId)) {
      return true;
    }

    return false;
  }

  /**
   * Update file access statistics
   */
  private async updateFileAccess(fileId: string): Promise<void> {
    try {
      await firestore.collection('fileMetadata').doc(fileId).update({
        downloadCount: firestore.FieldValue.increment(1),
        lastAccessedAt: new Date()
      });
    } catch (error) {
      logger.error(`Error updating file access for ${fileId}:`, error);
    }
  }

  /**
   * Get signed URL for private files
   */
  private async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const file = this.bucket.file(filePath);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 1000
      });
      return url;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Schedule virus scan for uploaded file
   */
  private async scheduleVirusScan(fileId: string): Promise<void> {
    try {
      // Add to virus scan queue
      await firestore.collection('virusScanQueue').add({
        fileId,
        status: 'pending',
        createdAt: new Date()
      });
    } catch (error) {
      logger.error(`Error scheduling virus scan for ${fileId}:`, error);
    }
  }

  /**
   * Get user role (placeholder - implement based on your RBAC system)
   */
  private async getUserRole(userId: string): Promise<string | null> {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      return userDoc.exists ? userDoc.data()?.role || null : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is admin (placeholder - implement based on your RBAC system)
   */
  private async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const role = await this.getUserRole(userId);
      return role === 'admin' || role === 'super_admin';
    } catch (error) {
      return false;
    }
  }
}

export const fileStorageService = new FileStorageService();
export default fileStorageService;