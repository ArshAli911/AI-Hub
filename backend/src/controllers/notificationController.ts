import { Request, Response } from 'express';
import { sendNotificationToDevice, sendNotificationToTopic } from '../services/notificationService';

export const sendToDevice = async (req: Request, res: Response) => {
  const { token, title, body, data } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ message: 'Missing required fields: token, title, body' });
  }

  try {
    const response = await sendNotificationToDevice(token, title, body, data);
    res.status(200).json({ message: 'Notification sent successfully!', response });
  } catch (error: any) {
    console.error('Error sending notification to device:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
};

export const sendToTopic = async (req: Request, res: Response) => {
  const { topic, title, body, data } = req.body;

  if (!topic || !title || !body) {
    return res.status(400).json({ message: 'Missing required fields: topic, title, body' });
  }

  const message = {
    notification: { title, body },
    data: data || {},
    topic: topic,
  };

  try {
    const response = await sendNotificationToTopic(topic, title, body, data);
    res.status(200).json({ message: 'Notification sent to topic successfully!', response });
  } catch (error: any) {
    console.error('Error sending notification to topic:', error);
    res.status(500).json({ message: 'Failed to send notification to topic', error: error.message });
  }
}; 