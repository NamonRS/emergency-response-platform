import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/authValidators.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', optionalAuth, logout);
router.get('/me', authenticate, me);

export default router;