import { Request, Response } from 'express';
import multer from 'multer';
import { fileProcessingService, ImageProcessingOptions, VideoProcessingOptions } from '../services/fileProcessingService';
import { fileStorageService, FileUploadOptions } from '../services/fileStorageService';
import { fileSecurityService } from '../services/fileSecurityService';
import logger from '../services/loggerService';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/avi', 'video/quicktime',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/zip', 'application/x-rar-compressed'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Validation schemas
const uploadFileSchema = Joi.object({
  category: Joi.string().valid(
    'profile_images', 'post_images', 'post_files', 'prototype_files', 
    'prototype_images', 'session_recordings', 'session_materials',
    'marketplace_images', 'marketplace_files', 'temp_files'
  ).required(),
  subcategory: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isPublic: Joi.boolean().default(true),
  accessLevel: Joi.string().valid('public', 'authenticated', 'private', 'restricted').default('authenticated'),
  allowedUsers: Joi.array().items(Joi.string()).optional(),
  allowedRoles: Joi.array().items(Joi.string()).optional(),
  expiresAt: Joi.date().optional(),
  contextId: Joi.string().optional(),
  processImage: Joi.boolean().default(false),
  processVideo: Joi.boolean().default(false),
  generateThumbnails: Joi.boolean().default(false)
});

const imageProcessingSchema = Joi.object({
  resize: Joi.object({
    width: Joi.number().min(1).max(4000).optional(),
    height: Joi.number().min(1).max(4000).optional(),
    fit: Joi.string().valid('cover', 'contain', 'fill', 'inside', 'outside').default('cover'),
    position: Joi.string().valid('center', 'top', 'bottom', 'left', 'right').default('center')
  }).optional(),
  quality: Joi.number().min(1).max(100).default(80),
  format: Joi.string().valid('jpeg', 'png', 'webp', 'avif').default('jpeg'),
  watermark: Joi.object({
    text: Joi.string().optional(),
    position: Joi.string().valid('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center').default('bottom-right'),
    opacity: Joi.number().min(0).max(1).default(0.5)
  }).optional(),
  generateThumbnails: Joi.object({
    small: Joi.object({ width: Joi.number().required(), height: Joi.number().required() }),
    medium: Joi.object({ width: Joi.number().required(), height: Joi.number().required() }),
    large: Joi.object({ width: Joi.number().required(), height: Joi.number().required() })
  }).optional()
});

const videoProcessingSchema = Joi.object({
  compress: Joi.object({
    quality: Joi.string().valid('low', 'medium', 'high').default('medium'),
    bitrate: Joi.string().optional(),
    resolution: Joi.string().valid('480p', '720p', '1080p').optional()
  }).optional(),
  thumbnail: Joi.object({
    count: Joi.number().min(1).max(10).default(1),
    timestamps: Joi.array().items(Joi.string()).optional(),
    size: Joi.object({
      width: Joi.number().min(100).max(1000).default(320),
      height: Joi.number().min(100).max(1000).default(240)
    }).optional()
  }).optional(),
  format: Joi.string().valid('mp4', 'webm', 'avi').default('mp4'),
  maxDuration: Joi.number().min(1).max(3600).optional() // Max 1 hour
});

export class FileController {
  /**
   * Upload single file
   */
  uploadFile = asyncHandler(async (req: Request, res: Response) => {
    const uploadSingle = upload.single('file');
    
    uploadSingle(req, res, async (err) => {
      if (err) {
        logger.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      try {
        // Validate request body
        const { error, value } = uploadFileSchema.validate(req.body);
        if (error) {
          return res.status(400).json({
            success: false,
            message: error.details[0].message
          });
        }

        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const file = req.file;
        const options: FileUploadOptions = value;

        // Log file access
        await fileSecurityService.logFileAccess(
          'upload_attempt',
          userId,
          'upload',
          req.ip,
          req.get('User-Agent') || '',
          false
        );

        // Validate file against security policies
        const validation = await fileSecurityService.validateFile(
          file.originalname,
          file.mimetype,
          file.size
        );

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: 'File validation failed',
            violations: validation.violations
          });
        }

        // Perform virus scan
        const scanResult = await fileSecurityService.scanFile(
          `temp_${Date.now()}`,
          file.buffer,
          file.originalname
        );

        if (scanResult.status === 'infected' || scanResult.status === 'quarantined') {
          await fileSecurityService.logFileAccess(
            scanResult.fileId,
            userId,
            'upload',
            req.ip,
            req.get('User-Agent') || '',
            false,
            `Virus detected: ${scanResult.threats.join(', ')}`
          );

          return res.status(400).json({
            success: false,
            message: 'File contains malicious content',
            threats: scanResult.threats
          });
        }

        let processedFile;

        // Process file based on type
        if (file.mimetype.startsWith('image/') && options.processImage) {
          // Parse image processing options
          const imageOptions: ImageProcessingOptions = req.body.imageOptions ? 
            JSON.parse(req.body.imageOptions) : {};
          
          processedFile = await fileProcessingService.processImage(
            file.buffer,
            file.originalname,
            imageOptions
          );
        } else if (file.mimetype.startsWith('video/') && options.processVideo) {
          // Parse video processing options
          const videoOptions: VideoProcessingOptions = req.body.videoOptions ? 
            JSON.parse(req.body.videoOptions) : {};
          
          processedFile = await fileProcessingService.processVideo(
            file.buffer,
            file.originalname,
            videoOptions
          );
        } else {
          // Process as document or upload directly
          processedFile = await fileProcessingService.processDocument(
            file.buffer,
            file.originalname,
            { generateThumbnail: options.generateThumbnails }
          );
        }

        // Upload to storage
        const fileMetadata = await fileStorageService.uploadFile(
          file.buffer,
          file.originalname,
          userId,
          options,
          value.contextId
        );

        // Log successful upload
        await fileSecurityService.logFileAccess(
          fileMetadata.id,
          userId,
          'upload',
          req.ip,
          req.get('User-Agent') || '',
          true,
          undefined,
          {
            fileSize: file.size,
            mimeType: file.mimetype,
            category: options.category
          }
        );

        res.status(201).json({
          success: true,
          message: 'File uploaded successfully',
          data: {
            file: fileMetadata,
            processed: processedFile,
            virusScan: {
              status: scanResult.status,
              scannedAt: scanResult.scannedAt
            }
          }
        });

      } catch (error) {
        logger.error('Error in file upload:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error during file upload'
        });
      }
    });
  });

  /**
   * Upload multiple files
   */
  uploadMultipleFiles = asyncHandler(async (req: Request, res: Response) => {
    const uploadMultiple = upload.array('files', 10);
    
    uploadMultiple(req, res, async (err) => {
      if (err) {
        logger.error('Multiple file upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided'
        });
      }

      try {
        // Validate request body
        const { error, value } = uploadFileSchema.validate(req.body);
        if (error) {
          return res.status(400).json({
            success: false,
            message: error.details[0].message
          });
        }

        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const options: FileUploadOptions = value;
        const results = [];
        const errors = [];

        // Process each file
        for (const file of files) {
          try {
            // Validate file
            const validation = await fileSecurityService.validateFile(
              file.originalname,
              file.mimetype,
              file.size
            );

            if (!validation.valid) {
              errors.push({
                filename: file.originalname,
                error: 'Validation failed',
                violations: validation.violations
              });
              continue;
            }

            // Virus scan
            const scanResult = await fileSecurityService.scanFile(
              `temp_${Date.now()}_${Math.random()}`,
              file.buffer,
              file.originalname
            );

            if (scanResult.status === 'infected' || scanResult.status === 'quarantined') {
              errors.push({
                filename: file.originalname,
                error: 'Virus detected',
                threats: scanResult.threats
              });
              continue;
            }

            // Process and upload file
            let processedFile;
            if (file.mimetype.startsWith('image/') && options.processImage) {
              const imageOptions: ImageProcessingOptions = req.body.imageOptions ? 
                JSON.parse(req.body.imageOptions) : {};
              processedFile = await fileProcessingService.processImage(
                file.buffer,
                file.originalname,
                imageOptions
              );
            } else if (file.mimetype.startsWith('video/') && options.processVideo) {
              const videoOptions: VideoProcessingOptions = req.body.videoOptions ? 
                JSON.parse(req.body.videoOptions) : {};
              processedFile = await fileProcessingService.processVideo(
                file.buffer,
                file.originalname,
                videoOptions
              );
            } else {
              processedFile = await fileProcessingService.processDocument(
                file.buffer,
                file.originalname,
                { generateThumbnail: options.generateThumbnails }
              );
            }

            const fileMetadata = await fileStorageService.uploadFile(
              file.buffer,
              file.originalname,
              userId,
              options,
              value.contextId
            );

            results.push({
              file: fileMetadata,
              processed: processedFile,
              virusScan: {
                status: scanResult.status,
                scannedAt: scanResult.scannedAt
              }
            });

            // Log successful upload
            await fileSecurityService.logFileAccess(
              fileMetadata.id,
              userId,
              'upload',
              req.ip,
              req.get('User-Agent') || '',
              true
            );

          } catch (fileError) {
            logger.error(`Error processing file ${file.originalname}:`, fileError);
            errors.push({
              filename: file.originalname,
              error: fileError instanceof Error ? fileError.message : 'Processing failed'
            });
          }
        }

        res.status(201).json({
          success: true,
          message: `Processed ${results.length} files successfully`,
          data: {
            uploaded: results,
            errors: errors,
            summary: {
              total: files.length,
              successful: results.length,
              failed: errors.length
            }
          }
        });

      } catch (error) {
        logger.error('Error in multiple file upload:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error during file upload'
        });
      }
    });
  });

  /**
   * Get file metadata
   */
  getFileMetadata = asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const metadata = await fileStorageService.getFileMetadata(fileId);
    
    if (!metadata) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Log file access
    await fileSecurityService.logFileAccess(
      fileId,
      userId,
      'view',
      req.ip,
      req.get('User-Agent') || '',
      true
    );

    res.json({
      success: true,
      data: metadata
    });
  });

  /**
   * Download file
   */
  downloadFile = asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const { buffer, metadata } = await fileStorageService.downloadFile(fileId, userId);

      // Log file download
      await fileSecurityService.logFileAccess(
        fileId,
        userId,
        'download',
        req.ip,
        req.get('User-Agent') || '',
        true
      );

      res.set({
        'Content-Type': metadata.mimeType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${metadata.originalName}"`
      });

      res.send(buffer);

    } catch (error) {
      logger.error(`Error downloading file ${fileId}:`, error);
      
      // Log failed download
      await fileSecurityService.logFileAccess(
        fileId,
        userId,
        'download',
        req.ip,
        req.get('User-Agent') || '',
        false,
        error instanceof Error ? error.message : 'Download failed'
      );

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Download failed'
      });
    }
  });

  /**
   * Delete file
   */
  deleteFile = asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      await fileStorageService.deleteFile(fileId, userId);

      // Log file deletion
      await fileSecurityService.logFileAccess(
        fileId,
        userId,
        'delete',
        req.ip,
        req.get('User-Agent') || '',
        true
      );

      res.json({
        success: true,
        message: 'File deleted successfully'
      });

    } catch (error) {
      logger.error(`Error deleting file ${fileId}:`, error);
      
      // Log failed deletion
      await fileSecurityService.logFileAccess(
        fileId,
        userId,
        'delete',
        req.ip,
        req.get('User-Agent') || '',
        false,
        error instanceof Error ? error.message : 'Deletion failed'
      );

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Deletion failed'
      });
    }
  });

  /**
   * Get user files
   */
  getUserFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { category, limit = 20, offset = 0 } = req.query;

    const result = await fileStorageService.getUserFiles(
      userId,
      category as any,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * Get user storage quota
   */
  getUserQuota = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const quota = await fileStorageService.getUserQuota(userId);

    res.json({
      success: true,
      data: quota
    });
  });

  /**
   * Get file access logs (admin only)
   */
  getFileAccessLogs = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check admin permissions (implement based on your RBAC system)
    // For now, assuming admin check is implemented elsewhere

    const { fileId, targetUserId, action, startDate, endDate, limit = 100 } = req.query;

    const logs = await fileSecurityService.getFileAccessLogs(
      fileId as string,
      targetUserId as string,
      action as any,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: logs
    });
  });

  /**
   * Get quarantined files (admin only)
   */
  getQuarantinedFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { limit = 50 } = req.query;

    const quarantinedFiles = await fileSecurityService.getQuarantinedFiles(
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: quarantinedFiles
    });
  });

  /**
   * Release file from quarantine (admin only)
   */
  releaseFromQuarantine = asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      await fileSecurityService.releaseFromQuarantine(fileId, userId);

      res.json({
        success: true,
        message: 'File released from quarantine successfully'
      });

    } catch (error) {
      logger.error(`Error releasing file from quarantine ${fileId}:`, error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Release failed'
      });
    }
  });

  /**
   * Process existing image
   */
  processImage = [
    validateRequest(imageProcessingSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { fileId } = req.params;
      const userId = req.user?.uid;
      const options: ImageProcessingOptions = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      try {
        // Download original file
        const { buffer, metadata } = await fileStorageService.downloadFile(fileId, userId);

        if (!metadata.mimeType.startsWith('image/')) {
          return res.status(400).json({
            success: false,
            message: 'File is not an image'
          });
        }

        // Process image
        const processedFile = await fileProcessingService.processImage(
          buffer,
          metadata.originalName,
          options
        );

        res.json({
          success: true,
          message: 'Image processed successfully',
          data: processedFile
        });

      } catch (error) {
        logger.error(`Error processing image ${fileId}:`, error);
        res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    })
  ];

  /**
   * Process existing video
   */
  processVideo = [
    validateRequest(videoProcessingSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { fileId } = req.params;
      const userId = req.user?.uid;
      const options: VideoProcessingOptions = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      try {
        // Download original file
        const { buffer, metadata } = await fileStorageService.downloadFile(fileId, userId);

        if (!metadata.mimeType.startsWith('video/')) {
          return res.status(400).json({
            success: false,
            message: 'File is not a video'
          });
        }

        // Process video
        const processedFile = await fileProcessingService.processVideo(
          buffer,
          metadata.originalName,
          options
        );

        res.json({
          success: true,
          message: 'Video processed successfully',
          data: processedFile
        });

      } catch (error) {
        logger.error(`Error processing video ${fileId}:`, error);
        res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    })
  ];
}

export const fileController = new FileController();
export default fileController;