import jwt from 'jsonwebtoken';
import { db } from './database.js';

export const JWT_SECRET = 'super-secret-key-revisa-aula';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido ou inválido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar o usuário no banco de dados para garantir que ele ainda existe
    const users = await db.get('users');
    const user = users.find(u => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Injetar dados do usuário no request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token expirado ou inválido' });
  }
}
