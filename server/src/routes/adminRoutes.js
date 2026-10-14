import { Router } from 'express';
import { getUsers } from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Every route in this file is administrator-only, enforced on the server.
router.use(authenticate, requireRole('admin'));

router.get('/users', getUsers);

export default router;