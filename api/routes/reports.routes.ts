import { Router } from 'express';
import { 
  getDashboardStats, 
  getSalesSummary, 
  getReportsByWarehouse, 
  getReportsByBrand, 
  getTopProducts,
  getAuditLogs
} from '../controllers/reports.controller';
import { verifyToken } from '../utils/jwt';

const router = Router();

router.use(verifyToken);

router.get('/dashboard', getDashboardStats);
router.get('/sales-summary', getSalesSummary);
router.get('/by-warehouse', getReportsByWarehouse);
router.get('/by-brand', getReportsByBrand);
router.get('/top-products', getTopProducts);
router.get('/audit-logs', getAuditLogs);

export default router;
