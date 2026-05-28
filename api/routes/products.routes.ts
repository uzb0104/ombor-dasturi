import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/products.controller';
import { verifyToken } from '../utils/jwt';

const router = Router();

// Hozircha barcha routelarga auth o'rnatamiz
router.use(verifyToken);

router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
