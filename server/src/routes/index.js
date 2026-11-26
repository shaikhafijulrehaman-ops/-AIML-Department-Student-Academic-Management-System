import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import hodRoutes from './hodRoutes.js';
import studentRoutes from './studentRoutes.js';

const router = Router();

// Mount API routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/hod', hodRoutes);
router.use('/student', studentRoutes);

export default router;
