import { Router } from 'express';
import { getSales, createSale, deleteSale } from '../controllers/sales.controller';
import { verifyToken } from '../utils/jwt';

const router = Router();

router.use(verifyToken);

router.get('/', getSales);
router.post('/', createSale);
router.delete('/:id', deleteSale);

export default router;
