import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET muhit o\'zgaruvchisi topilmadi! .env faylni tekshiring.');
}

export const generateToken = (user: any) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, warehouse_id: user.warehouse_id },
    SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Auth token topilmadi' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Noto\'g\'ri token' });
  }
};
