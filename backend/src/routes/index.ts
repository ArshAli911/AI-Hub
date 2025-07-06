import { Router } from 'express';
import userRoutes from './userRoutes';
import marketplaceRoutes from './marketplaceRoutes';
import mentorRoutes from './mentorRoutes';
import prototypeRoutes from './prototypeRoutes';
import notificationRoutes from './notificationRoutes';
import adminRoutes from './adminRoutes';
import realtimeRoutes from './realtimeRoutes';

const router = Router();

// API Routes
router.use('/users', userRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/mentors', mentorRoutes);
router.use('/prototypes', prototypeRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/realtime', realtimeRoutes);

export default router; 