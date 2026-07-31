import pg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function runTests() {
  console.log('--- Testing User Password CRUD Operations ---');
  try {
    // 1. Create a dummy test user
    const testUserId = 'u_test_pw_' + Date.now();
    const testEmail = `testuser_${Date.now()}@example.com`;
    const initialPw = 'initialPass123!';
    const initialPwHash = crypto.createHash('sha256').update(initialPw).digest('hex');

    await pool.query(
      `INSERT INTO users (id, name, email, global_role, department, password_hash) VALUES ($1, $2, $3, $4, $5, $6)`,
      [testUserId, 'Test User PW', testEmail, 'Employee', 'QA', initialPwHash]
    );
    console.log('✅ Created test user:', testUserId);

    // 2. Read test user
    const selectRes = await pool.query('SELECT id, name, email, password_hash FROM users WHERE id = $1', [testUserId]);
    if (selectRes.rows[0].password_hash !== initialPwHash) {
      throw new Error('Initial password hash mismatch!');
    }
    console.log('✅ Read user password hash verified successfully.');

    // 3. Update password directly (Admin Reset simulation)
    const updatedPw = 'newAdminPass456!';
    const updatedPwHash = crypto.createHash('sha256').update(updatedPw).digest('hex');
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [updatedPwHash, testUserId]);

    const selectRes2 = await pool.query('SELECT password_hash FROM users WHERE id = $1', [testUserId]);
    if (selectRes2.rows[0].password_hash !== updatedPwHash) {
      throw new Error('Updated password hash mismatch!');
    }
    console.log('✅ Admin Reset password hash updated successfully.');

    // 4. Delete test user (Cleanup)
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    console.log('✅ Deleted test user successfully.');

    console.log('🎉 ALL USER PASSWORD CRUD TESTS PASSED CLEANLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await pool.end();
  }
}

runTests();
