import { Router } from 'express';
import { createUser, setCustomClaims, getUserById, deleteUser } from '../controllers/userController';
import { verifyIdToken, requireAdmin } from '../middleware/authMiddleware';
import { validate, schemas } from '../middleware/validationMiddleware';

const router = Router();

// Route to create a new user (admin-only)
router.post('/create', verifyIdToken, requireAdmin, validate(schemas.createUser), createUser);

// Route to set custom claims for a user (admin-only)
router.post('/set-claims', verifyIdToken, requireAdmin, validate(schemas.setCustomClaims), setCustomClaims);

// Route to get user details by UID (authenticated users can get their own profile)
router.get('/:uid', verifyIdToken, getUserById);

// Route to delete a user (admin-only)
router.delete('/:uid', verifyIdToken, requireAdmin, deleteUser);

export default router; 