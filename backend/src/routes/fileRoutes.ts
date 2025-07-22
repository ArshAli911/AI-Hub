import { Router } from 'express';
import { fileController } from '../controllers/fileController';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication to all file routes
router.use(authenticateToken);

// File upload routes
router.post('/upload', 
  rateLimiter.fileUpload, 
  fileController.uploadFile
);

router.post('/upload/multiple', 
  rateLimiter.fileUpload, 
  fileController.uploadMultipleFiles
);

// File management routes
router.get('/:fileId/metadata', fileController.getFileMetadata);
router.get('/:fileId/download', fileController.downloadFile);
router.delete('/:fileId', fileController.deleteFile);

// User file management
router.get('/user/files', fileController.getUserFiles);
router.get('/user/quota', fileController.getUserQuota);

// File processing routes
router.post('/:fileId/process/image', fileController.processImage);
router.post('/:fileId/process/video', fileController.processVideo);

// Admin routes (require admin permissions)
router.get('/admin/access-logs', fileController.getFileAccessLogs);
router.get('/admin/quarantined', fileController.getQuarantinedFiles);
router.post('/admin/quarantine/:fileId/release', fileController.releaseFromQuarantine);

export default router;