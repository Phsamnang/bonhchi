import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../lib/config.js';
import { authRepository } from './auth.repository.js';

export function mapAppRoleToPgRole(appRole: string): string {
  switch (appRole) {
    case 'owner':
      return 'bonchi_owner';
    case 'manager':
      return 'bonchi_manager';
    case 'staff':
      return 'bonchi_staff';
    default:
      return 'anon';
  }
}

export function generateToken(user: { id: number; role: string; username: string; name: string; phone?: string | null }) {
  const pgRole = mapAppRoleToPgRole(user.role);
  return jwt.sign(
    {
      sub: String(user.id),
      role: pgRole,
      app_role: user.role,
      username: user.username,
      name: user.name,
      phone: user.phone,
      aud: 'postgrest',
      iss: 'bonchi-auth',
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any, algorithm: 'HS256' }
  );
}

export class AuthService {
  async login(username: string, password?: string) {
    const user = await authRepository.findByUsername(username);
    if (!user || !user.is_active) {
      throw new Error('Invalid username or user is inactive');
    }

    if (password) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        throw new Error('Invalid password');
      }
    }

    const token = generateToken(user);
    await authRepository.updateLastLogin(user.id);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url,
      },
    };
  }

  async getCurrentUser(userId: number) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url,
    };
  }
}

export const authService = new AuthService();
