import { Router, Request, Response } from 'express';
import { sendToDevice, sendToTopic } from '../controllers/notificationController';

const router = Router();

// Placeholder endpoint to send a direct notification to a device token
router.post('/send-to-device', sendToDevice);

// Placeholder endpoint to send a notification to a topic
router.post('/send-to-topic', sendToTopic);

export default router; 