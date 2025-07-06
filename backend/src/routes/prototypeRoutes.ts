import { Router, Request, Response } from 'express';
import { getPrototypes, getPrototypeById, createPrototype, submitFeedback } from '../controllers/prototypeController';

const router = Router();

router.get('/', getPrototypes);
router.get('/:id', getPrototypeById);
router.post('/', createPrototype);
router.post('/:id/feedback', submitFeedback);

// Add more prototype-related endpoints as needed

export default router; 