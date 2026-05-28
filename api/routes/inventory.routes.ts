import { Router } from 'express';
import { getInventory, updateInventory } from '../controllers/inventory.controller';
import { verifyToken } from '../utils/jwt';

const router = Router();

router.use(verifyToken);

router.get('/', getInventory);
router.post('/update', updateInventory);

export default router;
