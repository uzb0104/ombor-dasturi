import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import inventoryRoutes from './routes/inventory.routes';
import salesRoutes from './routes/sales.routes';
import customersRoutes from './routes/customers.routes';
import suppliersRoutes from './routes/suppliers.routes';
import employeesRoutes from './routes/employees.routes';
import expensesRoutes from './routes/expenses.routes';
import reportsRoutes from './routes/reports.routes';
import searchRoutes from './routes/search.routes';
import notificationsRoutes from './routes/notifications.routes';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'AutoERP Pro API is running!' });
});

// Routelar
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationsRoutes);

export default app;
