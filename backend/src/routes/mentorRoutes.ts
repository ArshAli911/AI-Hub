import { Router, Request, Response } from 'express';
import { getMentors, getMentorById, bookMentorSession } from '../controllers/mentorController';

const router = Router();

router.get('/', getMentors);
router.get('/:id', getMentorById);
router.post('/book', bookMentorSession);

// Add more mentor-related endpoints as needed

export default router; 