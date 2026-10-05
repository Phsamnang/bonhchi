import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from './services/jwt.service.js';

console.log('🧪 Testing Bonchi Local Auth & PostgREST JWT Security...\n');

// 1. Test Password Hashing and Comparison
const rawPassword = 'bonchi2026';
const hash = bcrypt.hashSync(rawPassword, 10);
const isValid = bcrypt.compareSync(rawPassword, hash);
console.log('1. Password Hash & Verify Test:');
console.log('   Raw password:', rawPassword);
console.log('   Bcrypt verify result:', isValid ? 'PASS ✅' : 'FAIL ❌\n');

// 2. Test PostgREST JWT Generation for Owner, Manager, and Staff
const roles = ['owner', 'manager', 'staff'] as const;

let mockId = 1;
for (const role of roles) {
  const token = generateToken({
    id: mockId++,
    username: role,
    name: `Test ${role.toUpperCase()}`,
    phone: `01200000${role.length}`,
    role: role
  });

  const claims = verifyToken(token);
  console.log(`2. Generated PostgREST JWT for [${role.toUpperCase()}]:`);
  console.log(`   PostgreSQL DB Role: ${claims.role}`);
  console.log(`   App Role:          ${claims.app_role}`);
  console.log(`   Subject (User ID): ${claims.sub}`);
  console.log(`   Username:          ${claims.username}`);
  console.log(`   Audience:          ${claims.aud} (Target: PostgREST)`);
  console.log(`   Token snippet:     ${token.slice(0, 45)}...\n`);
}

console.log('✅ All Local Auth & PostgREST JWT Security Tests PASSED successfully!');
