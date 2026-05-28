import { Router } from 'express';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, paySalaryOrAdvance } from '../controllers/employees.controller';
import { verifyToken } from '../utils/jwt';

const router = Router();

router.use(verifyToken);

router.get('/', getEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);
router.post('/:id/pay', paySalaryOrAdvance);

export default router;
