import { Router } from 'express';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerSales, payDebt } from '../controllers/customers.controller';
import { verifyToken } from '../utils/jwt';

const router = Router();

router.use(verifyToken);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/sales', getCustomerSales);
router.post('/:id/pay-debt', payDebt);

export default router;
