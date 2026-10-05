import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../services/jwt.service.js';
import { authenticateJwt, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/index.js';
import { pool, isDbConnected } from '../config/db.js';

const router = Router();

// Fallback in-memory users for quick local development
const LOCAL_USERS: any[] = [
  {
    id: 1,
    username: 'owner',
    name: 'Lok Bong (Owner)',
    phone: '012999001',
    password_hash: bcrypt.hashSync('bonchi2026', 10),
    role: 'owner' as UserRole
  },
  {
    id: 2,
    username: 'manager',
    name: 'Sokha (Manager)',
    phone: '012999002',
    password_hash: bcrypt.hashSync('bonchi2026', 10),
    role: 'manager' as UserRole
  },
  {
    id: 3,
    username: 'staff',
    name: 'Srey Mom (Staff)',
    phone: '012999003',
    password_hash: bcrypt.hashSync('bonchi2026', 10),
    role: 'staff' as UserRole
  }
];

// 1. Standard Login (Username & Password - not strict)
router.post('/login', async (req: Request, res: Response) => {
  const username = (req.body.username || req.body.identifier || '').toString().trim();
  const password = (req.body.password || '').toString();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    let user = null;

    // Check PostgreSQL if connected
    if (isDbConnected()) {
      const result = await pool.query(
        'SELECT id, username, name, phone, password_hash, role FROM users WHERE username = $1 OR phone = $1',
        [username]
      );
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    }

    // Fallback to local memory users if DB is offline or user not found
    if (!user) {
      user = LOCAL_USERS.find(u => u.username === username || u.phone === username);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role
    });

    res.json({
      success: true,
      token_type: 'Bearer',
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        role: user.role
      },
      postgrest_note: 'Include Authorization: Bearer <access_token> when querying PostgREST at :3001'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login Error', message: err.message });
  }
});

// 2. User Registration — only a signed-in owner can create accounts
router.post('/register', authenticateJwt, requireRole(['owner']), async (req: Request, res: Response) => {
  const username = (req.body.username || req.body.name || '').toString().trim().toLowerCase();
  const password = (req.body.password || '').toString();
  const name = (req.body.name || req.body.username || username).toString().trim();
  const phone = req.body.phone ? req.body.phone.toString().trim() : null;
  const role = req.body.role;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const assignedRole: UserRole = role && ['owner', 'manager', 'staff'].includes(role) ? role : 'staff';
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    let newUser: any = null;

    if (isDbConnected()) {
      const result = await pool.query(
        `INSERT INTO users (username, name, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, name, phone, role`,
        [username, name, phone, passwordHash, assignedRole]
      );
      newUser = result.rows[0];
    } else {
      newUser = {
        id: Date.now(),
        username,
        name,
        phone,
        password_hash: passwordHash,
        role: assignedRole
      };
      LOCAL_USERS.push(newUser);
    }

    const token = generateToken({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      phone: newUser.phone,
      role: newUser.role
    });

    res.status(201).json({
      success: true,
      token_type: 'Bearer',
      access_token: token,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role
      }
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration Error', message: err.message });
  }
});

// 3. Quick Demo Token Generator (For Dev & PostgREST Testing)
router.get('/demo-token', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const role = (req.query.role as UserRole) || 'owner';
  const targetUser = LOCAL_USERS.find(u => u.role === role) || LOCAL_USERS[0];
  const token = generateToken(targetUser);

  res.json({
    success: true,
    role: targetUser.role,
    user: targetUser.name,
    username: targetUser.username,
    token_type: 'Bearer',
    access_token: token,
    postgrest_usage: `curl http://localhost:3001/wallets -H "Authorization: Bearer ${token}"`
  });
});

// 4. Authenticated Profile
router.get('/me', authenticateJwt, (req: Request, res: Response) => {
  res.json({
    user: req.user
  });
});

export default router;
