import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { storage } from '../config/firebaseAdmin';
import logger from './loggerService';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  };
  quality?: number; // 1-100
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  watermark?: {
    text?: string;
    image?: Buffer;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
  generateThumbnails?: {
    small: { width: number; height: number };
    medium: { width: number; height: number };
    large: { width: number; height: number };
  };
}

export interface VideoProcessingOptions {
  compress?: {
    quality?: 'low' | 'medium' | 'high';
    bitrate?: string; // e.g., '1000k'
    resolution?: '480p' | '720p' | '1080p';
  };
  thumbnail?: {
    count?: number;
    timestamps?: string[]; // e.g., ['00:00:01', '00:00:05']
    size?: { width: number; height: number };
  };
  format?: 'mp4' | 'webm' | 'avi';
  maxDuration?: number; // in seconds
}

export interface ProcessedFile {
  id: string;
  originalName: string;
  processedName: string;
  url: string;
  size: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  duration?: number; // for videos
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  metadata: {
    processedAt: Date;
    processingTime: number; // in milliseconds
    originalSize: number;
    compressionRatio?: number;
  };
}

export class FileProcessingService {
  private tempDir = '/tmp/file-processing';

  constructor() {
    this.ensureTempDirectory();
  }

  /**
   * Process image file
   */
  async processImage(
    fileBuffer: Buffer,
    originalName: string,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedFile> {
    const startTime = Date.now();
    const fileId = uuidv4();
    const originalSize = fileBuffer.length;

    try {
      logger.info(`Starting image processing for ${originalName}`);

      let image = sharp(fileBuffer);
      
      // Get original metadata
      const metadata = await image.metadata();
      const originalDimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0
      };

      // Apply resize if specified
      if (options.resize) {
        image = image.resize({
          width: options.resize.width,
          height: options.resize.height,
          fit: options.resize.fit || 'cover',
          position: options.resize.position || 'center'
        });
      }

      // Apply watermark if specified
      if (options.watermark) {
        if (options.watermark.text) {
          // Text watermark
          const watermarkSvg = this.createTextWatermark(
            options.watermark.text,
            originalDimensions,
            options.watermark.position || 'bottom-right',
            options.watermark.opacity || 0.5
          );
          
          image = image.composite([{
            input: Buffer.from(watermarkSvg),
            gravity: this.getGravityFromPosition(options.watermark.position || 'bottom-right')
          }]);
        } else if (options.watermark.image) {
          // Image watermark
          image = image.composite([{
            input: options.watermark.image,
            gravity: this.getGravityFromPosition(options.watermark.position || 'bottom-right'),
            blend: 'over'
          }]);
        }
      }

      // Set format and quality
      const format = options.format || 'jpeg';
      const quality = options.quality || 80;

      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality });
          break;
        case 'png':
          image = image.png({ quality });
          break;
        case 'webp':
          image = image.webp({ quality });
          break;
        case 'avif':
          image = image.avif({ quality });
          break;
      }

      // Process main image
      const processedBuffer = await image.toBuffer();
      const processedName = `${fileId}.${format}`;
      
      // Get processed dimensions
      const processedMetadata = await sharp(processedBuffer).metadata();
      const processedDimensions = {
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0
      };

      // Generate thumbnails if requested
      const thumbnails: ProcessedFile['thumbnails'] = {};
      if (options.generateThumbnails) {
        for (const [size, dimensions] of Object.entries(options.generateThumbnails)) {
          const thumbnailBuffer = await sharp(fileBuffer)
            .resize(dimensions.width, dimensions.height, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();
          
          const thumbnailName = `${fileId}_${size}.jpeg`;
          const thumbnailUrl = await this.uploadToStorage(thumbnailBuffer, thumbnailName, 'image/jpeg');
          thumbnails[size as keyof ProcessedFile['thumbnails']] = thumbnailUrl;
        }
      }

      // Upload processed image
      const url = await this.uploadToStorage(processedBuffer, processedName, `image/${format}`);

      const processingTime = Date.now() - startTime;
      const compressionRatio = originalSize > 0 ? (originalSize - processedBuffer.length) / originalSize : 0;

      const result: ProcessedFile = {
        id: fileId,
        originalName,
        processedName,
        url,
        size: processedBuffer.length,
        mimeType: `image/${format}`,
        dimensions: processedDimensions,
        thumbnails,
        metadata: {
          processedAt: new Date(),
          processingTime,
          originalSize,
          compressionRatio
        }
      };

      logger.info(`Image processing completed for ${originalName} in ${processingTime}ms`);
      return result;

    } catch (error) {
      logger.error(`Error processing image ${originalName}:`, error);
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process video file
   */
  async processVideo(
    fileBuffer: Buffer,
    originalName: string,
    options: VideoProcessingOptions = {}
  ): Promise<ProcessedFile> {
    const startTime = Date.now();
    const fileId = uuidv4();
    const originalSize = fileBuffer.length;
    const tempInputPath = path.join(this.tempDir, `${fileId}_input`);
    const tempOutputPath = path.join(this.tempDir, `${fileId}_output.mp4`);

    try {
      logger.info(`Starting video processing for ${originalName}`);

      // Write buffer to temp file
      await fs.writeFile(tempInputPath, fileBuffer);

      // Get video metadata
      const metadata = await this.getVideoMetadata(tempInputPath);
      
      // Check duration limit
      if (options.maxDuration && metadata.duration > options.maxDuration) {
        throw new Error(`Video duration exceeds maximum allowed duration of ${options.maxDuration} seconds`);
      }

      // Process video
      await new Promise<void>((resolve, reject) => {
        let command = ffmpeg(tempInputPath)
          .output(tempOutputPath)
          .format(options.format || 'mp4');

        // Apply compression settings
        if (options.compress) {
          const { quality, bitrate, resolution } = options.compress;
          
          if (bitrate) {
            command = command.videoBitrate(bitrate);
          }
          
          if (resolution) {
            const resolutionMap = {
              '480p': '854x480',
              '720p': '1280x720',
              '1080p': '1920x1080'
            };
            command = command.size(resolutionMap[resolution]);
          }
          
          if (quality) {
            const qualityMap = {
              'low': 28,
              'medium': 23,
              'high': 18
            };
            command = command.videoCodec('libx264').addOption('-crf', qualityMap[quality].toString());
          }
        }

        command
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Read processed video
      const processedBuffer = await fs.readFile(tempOutputPath);
      const processedName = `${fileId}.${options.format || 'mp4'}`;

      // Generate thumbnails if requested
      const thumbnails: ProcessedFile['thumbnails'] = {};
      if (options.thumbnail) {
        const thumbnailCount = options.thumbnail.count || 1;
        const timestamps = options.thumbnail.timestamps || ['00:00:01'];
        const size = options.thumbnail.size || { width: 320, height: 240 };

        for (let i = 0; i < Math.min(thumbnailCount, timestamps.length); i++) {
          const thumbnailPath = path.join(this.tempDir, `${fileId}_thumb_${i}.jpg`);
          
          await new Promise<void>((resolve, reject) => {
            ffmpeg(tempInputPath)
              .seekInput(timestamps[i])
              .frames(1)
              .size(`${size.width}x${size.height}`)
              .output(thumbnailPath)
              .on('end', () => resolve())
              .on('error', (err) => reject(err))
              .run();
          });

          const thumbnailBuffer = await fs.readFile(thumbnailPath);
          const thumbnailName = `${fileId}_thumb_${i}.jpg`;
          const thumbnailUrl = await this.uploadToStorage(thumbnailBuffer, thumbnailName, 'image/jpeg');
          
          if (i === 0) thumbnails.small = thumbnailUrl;
          if (i === 1) thumbnails.medium = thumbnailUrl;
          if (i === 2) thumbnails.large = thumbnailUrl;

          // Clean up thumbnail file
          await fs.unlink(thumbnailPath).catch(() => {});
        }
      }

      // Upload processed video
      const url = await this.uploadToStorage(processedBuffer, processedName, `video/${options.format || 'mp4'}`);

      // Clean up temp files
      await Promise.all([
        fs.unlink(tempInputPath).catch(() => {}),
        fs.unlink(tempOutputPath).catch(() => {})
      ]);

      const processingTime = Date.now() - startTime;
      const compressionRatio = originalSize > 0 ? (originalSize - processedBuffer.length) / originalSize : 0;

      const result: ProcessedFile = {
        id: fileId,
        originalName,
        processedName,
        url,
        size: processedBuffer.length,
        mimeType: `video/${options.format || 'mp4'}`,
        duration: metadata.duration,
        thumbnails,
        metadata: {
          processedAt: new Date(),
          processingTime,
          originalSize,
          compressionRatio
        }
      };

      logger.info(`Video processing completed for ${originalName} in ${processingTime}ms`);
      return result;

    } catch (error) {
      // Clean up temp files on error
      await Promise.all([
        fs.unlink(tempInputPath).catch(() => {}),
        fs.unlink(tempOutputPath).catch(() => {})
      ]);

      logger.error(`Error processing video ${originalName}:`, error);
      throw new Error(`Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process document file (PDF optimization, thumbnail generation)
   */
  async processDocument(
    fileBuffer: Buffer,
    originalName: string,
    options: { generateThumbnail?: boolean } = {}
  ): Promise<ProcessedFile> {
    const startTime = Date.now();
    const fileId = uuidv4();
    const originalSize = fileBuffer.length;

    try {
      logger.info(`Starting document processing for ${originalName}`);

      const processedName = `${fileId}_${originalName}`;
      const mimeType = this.getMimeTypeFromExtension(originalName);

      // For now, just upload the document as-is
      // In a production environment, you might want to:
      // - Optimize PDF files
      // - Generate thumbnails for documents
      // - Extract text for search indexing
      const url = await this.uploadToStorage(fileBuffer, processedName, mimeType);

      const processingTime = Date.now() - startTime;

      const result: ProcessedFile = {
        id: fileId,
        originalName,
        processedName,
        url,
        size: fileBuffer.length,
        mimeType,
        metadata: {
          processedAt: new Date(),
          processingTime,
          originalSize,
          compressionRatio: 0
        }
      };

      logger.info(`Document processing completed for ${originalName} in ${processingTime}ms`);
      return result;

    } catch (error) {
      logger.error(`Error processing document ${originalName}:`, error);
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload file to Firebase Storage
   */
  private async uploadToStorage(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    try {
      const bucket = storage.bucket();
      const file = bucket.file(`processed/${fileName}`);

      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
      });

      await file.makePublic();
      return file.publicUrl();
    } catch (error) {
      logger.error('Error uploading to Firebase Storage:', error);
      throw error;
    }
  }

  /**
   * Get video metadata using ffprobe
   */
  private async getVideoMetadata(filePath: string): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        
        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0
        });
      });
    });
  }

  /**
   * Create text watermark SVG
   */
  private createTextWatermark(
    text: string,
    dimensions: { width: number; height: number },
    position: string,
    opacity: number
  ): string {
    const fontSize = Math.max(dimensions.width / 20, 16);
    const padding = 20;
    
    let x = padding;
    let y = fontSize + padding;
    
    switch (position) {
      case 'top-right':
        x = dimensions.width - padding;
        y = fontSize + padding;
        break;
      case 'bottom-left':
        x = padding;
        y = dimensions.height - padding;
        break;
      case 'bottom-right':
        x = dimensions.width - padding;
        y = dimensions.height - padding;
        break;
      case 'center':
        x = dimensions.width / 2;
        y = dimensions.height / 2;
        break;
    }

    return `
      <svg width="${dimensions.width}" height="${dimensions.height}">
        <text x="${x}" y="${y}" 
              font-family="Arial, sans-serif" 
              font-size="${fontSize}" 
              fill="white" 
              fill-opacity="${opacity}"
              text-anchor="${position.includes('right') ? 'end' : position.includes('center') ? 'middle' : 'start'}"
              stroke="black" 
              stroke-width="1" 
              stroke-opacity="${opacity * 0.5}">
          ${text}
        </text>
      </svg>
    `;
  }

  /**
   * Get Sharp gravity from position
   */
  private getGravityFromPosition(position: string): string {
    const gravityMap: Record<string, string> = {
      'top-left': 'northwest',
      'top-right': 'northeast',
      'bottom-left': 'southwest',
      'bottom-right': 'southeast',
      'center': 'center'
    };
    
    return gravityMap[position] || 'southeast';
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating temp directory:', error);
    }
  }
}

export const fileProcessingService = new FileProcessingService();
export default fileProcessingService;