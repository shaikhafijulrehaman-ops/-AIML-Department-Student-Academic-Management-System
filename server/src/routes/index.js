import { Router } from 'express';
import healthRoutes from './healthRoutes.js';

const router = Router();

// Mount API routes
router.use('/', healthRoutes);

export default router;
