import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notifications.controller';
import { verifyToken } from '../utils/jwt';

const router = Router();

router.use(verifyToken);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
