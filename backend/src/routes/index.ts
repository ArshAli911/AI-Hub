import { Router } from 'express';
import userRoutes from './userRoutes';
import marketplaceRoutes from './marketplaceRoutes';
import mentorRoutes from './mentorRoutes';
import prototypeRoutes from './prototypeRoutes';
import notificationRoutes from './notificationRoutes';
import adminRoutes from './adminRoutes';
import realtimeRoutes from './realtimeRoutes';
import fileRoutes from './fileRoutes';
import communicationRoutes from './communicationRoutes';
import backgroundJobsRoutes from './backgroundJobsRoutes';

const router = Router();

// API Routes
router.use('/users', userRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/mentors', mentorRoutes);
router.use('/prototypes', prototypeRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/realtime', realtimeRoutes);
router.use('/files', fileRoutes);
router.use('/communication', communicationRoutes);
router.use('/background-jobs', backgroundJobsRoutes);

export default router; 