import { queueService } from '../queueService';
import { fileProcessingService } from '../fileProcessingService';
import { fileStorageService } from '../fileStorageService';
import logger from '../loggerService';

export interface FileProcessingQueueData {
  type: 'image' | 'video' | 'document';
  fileId: string;
  userId: string;
  options?: {
    // Image processing options
    resize?: {
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
    };
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp' | 'avif';
    watermark?: {
      text?: string;
      image?: string; // Base64 encoded image
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
      opacity?: number;
    };
    generateThumbnails?: boolean;
    
    // Video processing options
    compress?: {
      quality?: 'low' | 'medium' | 'high';
      bitrate?: string;
      resolution?: '480p' | '720p' | '1080p';
    };
    thumbnail?: {
      count?: number;
      timestamps?: string[];
      size?: { width: number; height: number };
    };
    maxDuration?: number;
  };
}

/**
 * Initialize file processing queue processor
 */
export function initializeFileProcessingQueueProcessor(): void {
  // Register file processing queue processor
  queueService.registerQueue<FileProcessingQueueData>('fileProcessingQueue', async (data, job) => {
    logger.info(`Processing file job ${job.id} of type ${data.type} for file ${data.fileId}`);
    
    try {
      // Get file from storage
      const { buffer, metadata } = await fileStorageService.downloadFile(data.fileId, data.userId);
      
      let result;
      
      switch (data.type) {
        case 'image':
          if (!metadata.mimeType.startsWith('image/')) {
            throw new Error('File is not an image');
          }
          
          result = await fileProcessingService.processImage(
            buffer,
            metadata.originalName,
            {
              resize: data.options?.resize,
              quality: data.options?.quality,
              format: data.options?.format,
              watermark: data.options?.watermark ? {
                text: data.options.watermark.text,
                image: data.options.watermark.image ? 
                  Buffer.from(data.options.watermark.image, 'base64') : undefined,
                position: data.options.watermark.position,
                opacity: data.options.watermark.opacity
              } : undefined,
              generateThumbnails: data.options?.generateThumbnails ? {
                small: { width: 150, height: 150 },
                medium: { width: 300, height: 300 },
                large: { width: 600, height: 600 }
              } : undefined
            }
          );
          break;
          
        case 'video':
          if (!metadata.mimeType.startsWith('video/')) {
            throw new Error('File is not a video');
          }
          
          result = await fileProcessingService.processVideo(
            buffer,
            metadata.originalName,
            {
              compress: data.options?.compress,
              thumbnail: data.options?.thumbnail,
              format: data.options?.format as any,
              maxDuration: data.options?.maxDuration
            }
          );
          break;
          
        case 'document':
          result = await fileProcessingService.processDocument(
            buffer,
            metadata.originalName,
            { generateThumbnail: data.options?.generateThumbnails }
          );
          break;
          
        default:
          throw new Error(`Unknown file processing type: ${data.type}`);
      }
      
      // Update file metadata with processing results
      await fileStorageService.updateFileMetadata(data.fileId, {
        processedUrl: result.url,
        thumbnails: result.thumbnails,
        processedAt: new Date(),
        processingStatus: 'completed'
      });
      
      return result;
    } catch (error) {
      logger.error(`Error processing file job ${job.id}:`, error);
      
      // Update file metadata with error
      await fileStorageService.updateFileMetadata(data.fileId, {
        processingStatus: 'failed',
        processingError: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }, {
    concurrency: 3, // Process up to 3 files at once (resource intensive)
    pollInterval: 10000, // Check for new files every 10 seconds
    visibilityTimeout: 300000 // 5 minutes for file processing
  });
  
  // Start processing the queue
  queueService.startProcessing('fileProcessingQueue');
  logger.info('File processing queue processor initialized');
}

/**
 * Add file processing job to queue
 */
export async function queueFileProcessing(data: FileProcessingQueueData): Promise<string> {
  // Update file metadata to indicate processing is queued
  await fileStorageService.updateFileMetadata(data.fileId, {
    processingStatus: 'queued'
  });
  
  const job = await queueService.addJob('fileProcessingQueue', data, {
    priority: 0,
    maxAttempts: 3 // Retry failed processing up to 3 times
  });
  
  return job.id;
}

export default {
  initializeFileProcessingQueueProcessor,
  queueFileProcessing
};