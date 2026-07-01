import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../database.js';
import { authMiddleware, JWT_SECRET } from '../authMiddleware.js';
import { validateBody, validateEmail, sendError } from '../middleware/validate.js';

const REFRESH_SECRET = process.env.REFRESH_SECRET;
if (!REFRESH_SECRET) {
  console.error('❌ REFRESH_SECRET não definido.');
  process.exit(1);
}

const isSecure = process.env.NODE_ENV === 'production';
const SALT_ROUNDS = 12;

export const authRouter = Router();

// ── Helpers ──

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
}

function stripPassword(user) {
  const { password, ...rest } = user;
  return rest;
}

// ── POST /auth/register ──
authRouter.post('/register', validateBody('name', 'email', 'password'), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!validateEmail(email)) {
      return sendError(res, 400, 'Formato de e-mail inválido');
    }

    if (password.length < 6) {
      return sendError(res, 400, 'A senha deve ter no mínimo 6 caracteres');
    }

    const users = await db.get('users');
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return sendError(res, 400, 'E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert('users', newUser);
    const { accessToken, refreshToken } = generateTokens(newUser.id);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({ user: stripPassword(newUser), accessToken });
  } catch (error) {
    console.error('Erro no registro:', error);
    return sendError(res, 500, 'Erro interno ao registrar usuário');
  }
});

// ── POST /auth/login ──
authRouter.post('/login', validateBody('email', 'password'), async (req, res) => {
  try {
    const { email, password } = req.body;

    const users = await db.get('users');
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isPasswordValid) {
      return sendError(res, 401, 'E-mail ou senha incorretos');
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    setRefreshCookie(res, refreshToken);

    return res.json({ user: stripPassword(user), accessToken });
  } catch (error) {
    console.error('Erro no login:', error);
    return sendError(res, 500, 'Erro interno ao realizar login');
  }
});

// ── POST /auth/logout ──
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
  });
  return res.json({ message: 'Deslogado com sucesso' });
});

// ── POST /auth/refresh ──
authRouter.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return sendError(res, 401, 'Refresh token ausente');
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const users = await db.get('users');
    const user = users.find((u) => u.id === decoded.userId);

    if (!user) {
      return sendError(res, 401, 'Usuário não encontrado');
    }

    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ accessToken });
  } catch {
    return sendError(res, 401, 'Refresh token inválido ou expirado');
  }
});

// ── GET /auth/profile ──
authRouter.get('/profile', authMiddleware, (req, res) => {
  return res.json(stripPassword(req.user));
});
