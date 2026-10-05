import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { UserRole } from '../types/index.js';

dotenv.config();

// PostgREST-compatible JWT Secret (Minimum 32 characters)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_bonchi_jwt_key_2026_at_least_32_characters_long';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface UserTokenPayload {
  id: string | number;
  username?: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
}

export interface PostgrestJwtClaims {
  sub: string;
  role: string;           // Maps to PostgreSQL DB role: 'bonchi_owner' | 'bonchi_manager' | 'bonchi_staff'
  app_role: UserRole;     // Application role: 'owner' | 'manager' | 'staff'
  username?: string;
  name: string;
  phone?: string;
  aud: string;            // 'postgrest'
  iss: string;            // 'bonchi-auth'
  iat?: number;
  exp?: number;
}

/**
 * Maps the application user role to the corresponding PostgreSQL/PostgREST role
 */
export function mapAppRoleToPgRole(appRole: UserRole): string {
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

/**
 * Generates a PostgREST-compatible JWT
 */
export function generateToken(user: UserTokenPayload): string {
  const pgRole = mapAppRoleToPgRole(user.role);

  const claims: PostgrestJwtClaims = {
    sub: String(user.id),
    role: pgRole,
    app_role: user.role,
    username: user.username,
    name: user.name,
    phone: user.phone,
    aud: 'postgrest',
    iss: 'bonchi-auth'
  };

  return jwt.sign(claims, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
    algorithm: 'HS256'
  });
}

/**
 * Verifies a JWT and extracts claims
 */
export function verifyToken(token: string): PostgrestJwtClaims {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256']
  }) as PostgrestJwtClaims;
}
