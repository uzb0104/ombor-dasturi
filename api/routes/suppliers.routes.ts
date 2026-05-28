import { Router } from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getIncomingStock, paySupplier } from '../controllers/suppliers.controller';
import { verifyToken } from '../utils/jwt';

const router = Router();

router.use(verifyToken);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
router.get('/:id/incoming', getIncomingStock);
router.post('/:id/pay', paySupplier);

export default router;
