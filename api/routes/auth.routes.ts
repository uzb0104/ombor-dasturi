import { Router } from 'express';
import { login, register, getMe } from '../controllers/auth.controller';
import { verifyToken } from '../utils/jwt';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', verifyToken, getMe);

export default router;
