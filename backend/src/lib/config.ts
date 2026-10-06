import dotenv from 'dotenv';

dotenv.config();

// Enforce Asia/Phnom_Penh process timezone
process.env.TZ = 'Asia/Phnom_Penh';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/bonhchi_db',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_bonchi_jwt_key_2026_at_least_32_characters_long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  timezone: 'Asia/Phnom_Penh',
};
