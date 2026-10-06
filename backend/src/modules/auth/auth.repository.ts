import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, User } from '../../db/schema/index.js';

export class AuthRepository {
  async findByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async findById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async updateLastLogin(id: number): Promise<void> {
    await db.update(users).set({ updated_at: new Date() }).where(eq(users.id, id));
  }
}

export const authRepository = new AuthRepository();
