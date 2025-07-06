// src/services/storage.ts

import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { getApp } from 'firebase/app';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'error';
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
  metadata?: any;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  uri: string;
}

class StorageService {
  private storage = getStorage(getApp());

  /**
   * Request permissions for camera and media library
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return true;
      }

      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      return cameraStatus === 'granted' && mediaStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Pick an image from the camera or gallery
   */
  async pickImage(options: {
    source?: 'camera' | 'gallery';
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}): Promise<FileInfo | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera and media library permissions are required');
      }

      const {
        source = 'gallery',
        allowsEditing = true,
        aspect = [1, 1],
        quality = 0.8,
        maxWidth = 1024,
        maxHeight = 1024
      } = options;

      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing,
          aspect,
          quality,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          maxWidth,
          maxHeight
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing,
          aspect,
          quality,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          maxWidth,
          maxHeight
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        return {
          name: asset.fileName || `image_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
          type: 'image/jpeg',
          uri: asset.uri
        };
      }

      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  /**
   * Pick multiple images
   */
  async pickMultipleImages(options: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    maxCount?: number;
  } = {}): Promise<FileInfo[]> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera and media library permissions are required');
      }

      const {
        allowsEditing = false,
        aspect = [1, 1],
        quality = 0.8,
        maxWidth = 1024,
        maxHeight = 1024,
        maxCount = 10
      } = options;

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing,
        aspect,
        quality,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        maxWidth,
        maxHeight,
        allowsMultipleSelection: true,
        selectionLimit: maxCount
      });

      if (!result.canceled && result.assets) {
        return result.assets.map((asset, index) => ({
          name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
          size: asset.fileSize || 0,
          type: 'image/jpeg',
          uri: asset.uri
        }));
      }

      return [];
    } catch (error) {
      console.error('Error picking multiple images:', error);
      throw error;
    }
  }

  /**
   * Pick a document/file
   */
  async pickDocument(options: {
    type?: string;
    multiple?: boolean;
    maxCount?: number;
  } = {}): Promise<FileInfo | FileInfo[] | null> {
    try {
      const { type = '*/*', multiple = false, maxCount = 10 } = options;

      const result = await DocumentPicker.getDocumentAsync({
        type,
        multiple,
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets) {
        if (multiple) {
          return result.assets.slice(0, maxCount).map((asset, index) => ({
            name: asset.name || `document_${Date.now()}_${index}`,
            size: asset.size || 0,
            type: asset.mimeType || 'application/octet-stream',
            uri: asset.uri
          }));
        } else {
          const asset = result.assets[0];
          return {
            name: asset.name || `document_${Date.now()}`,
            size: asset.size || 0,
            type: asset.mimeType || 'application/octet-stream',
            uri: asset.uri
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error picking document:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Firebase Storage
   */
  async uploadFile(
    file: FileInfo,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Convert file URI to blob for web or use file system for mobile
      let fileBlob: Blob;
      
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        fileBlob = await response.blob();
      } else {
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64
        });
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        fileBlob = new Blob([byteArray], { type: file.type });
      }

      const storageRef = ref(this.storage, path);
      const uploadTask = uploadBytesResumable(storageRef, fileBlob, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = {
              progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              state: snapshot.state
            };
            onProgress?.(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata = uploadTask.snapshot.metadata;
              
              resolve({
                url: downloadURL,
                path: uploadTask.snapshot.ref.fullPath,
                size: metadata.size,
                mimeType: metadata.contentType || file.type,
                metadata: metadata.customMetadata
              });
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: FileInfo[],
    basePath: string,
    onProgress?: (progress: { current: number; total: number; fileProgress: UploadProgress }) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    let current = 0;

    for (const file of files) {
      try {
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${basePath}/${fileName}`;
        
        const result = await this.uploadFile(file, filePath, (fileProgress) => {
          onProgress?.({
            current,
            total: files.length,
            fileProgress
          });
        });
        
        results.push(result);
        current++;
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Delete a file from Firebase Storage
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const fileRef = ref(this.storage, path);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(paths: string[]): Promise<void> {
    try {
      await Promise.all(paths.map(path => this.deleteFile(path)));
    } catch (error) {
      console.error('Error deleting multiple files:', error);
      throw error;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<string[]> {
    try {
      const directoryRef = ref(this.storage, path);
      const result = await listAll(directoryRef);
      return result.items.map(item => item.fullPath);
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get download URL for a file
   */
  async getDownloadURL(path: string): Promise<string> {
    try {
      const fileRef = ref(this.storage, path);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Generate a unique file path
   */
  generateFilePath(folder: string, fileName: string, userId: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop() || '';
    const baseName = fileName.replace(`.${extension}`, '');
    
    return `${folder}/${userId}/${timestamp}_${randomId}_${baseName}.${extension}`;
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size <= maxSize;
  }

  /**
   * Validate file type
   */
  validateFileType(type: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(type);
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const storageService = new StorageService();
export default storageService; 