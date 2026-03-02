import { describe, it, expect } from 'vitest';
import { createTestApp, request } from '../helpers/test-app';
import { prisma } from '../../src/config/database';
import { generateToken } from '../../src/utils/crypto';

/**
 * Helper to directly insert a password reset token into the DB,
 * bypassing the rate-limited API endpoint.
 */
async function createResetToken(email: string): Promise<string> {
  await prisma.passwordReset.deleteMany({ where: { email } });
  const token = generateToken(32);
  await prisma.passwordReset.create({
    data: { email, token, createdAt: new Date() },
  });
  return token;
}

describe('POST /api/auth/password (forgot password)', () => {
  it('should accept valid email and return success message', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password')
      .send({ email: 'admin@pyrotype.local' });

    expect(res.status).toBe(200);
    expect(res.body.status).toContain('e-mailed your password reset link');
  });

  it('should return same response for nonexistent email (no enumeration)', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.status).toContain('e-mailed your password reset link');
  });

  it('should return success even with empty email (no enumeration)', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password')
      .send({});

    // The controller returns success even without email to prevent enumeration
    expect(res.status).toBe(200);
    expect(res.body.status).toContain('e-mailed your password reset link');
  });

  it('should create a password reset token for valid email', async () => {
    const app = createTestApp();
    // Clean up any existing tokens
    await prisma.passwordReset.deleteMany({ where: { email: 'admin@pyrotype.local' } });

    await request(app)
      .post('/api/auth/password')
      .send({ email: 'admin@pyrotype.local' });

    const resetRecord = await prisma.passwordReset.findFirst({
      where: { email: 'admin@pyrotype.local' },
    });

    expect(resetRecord).not.toBeNull();
    expect(resetRecord!.token).toBeDefined();
    expect(resetRecord!.token.length).toBeGreaterThan(0);
  });

  it('should not create reset token for nonexistent email', async () => {
    const app = createTestApp();
    const fakeEmail = `nonexistent_${Date.now()}@example.com`;

    await request(app)
      .post('/api/auth/password')
      .send({ email: fakeEmail });

    const resetRecord = await prisma.passwordReset.findFirst({
      where: { email: fakeEmail },
    });

    expect(resetRecord).toBeNull();
  });

  it('should replace existing reset token on repeated requests', async () => {
    // Use a fresh app for each request to avoid rate limiting
    await prisma.passwordReset.deleteMany({ where: { email: 'admin@pyrotype.local' } });

    const app1 = createTestApp();
    await request(app1)
      .post('/api/auth/password')
      .send({ email: 'admin@pyrotype.local' });

    const firstRecord = await prisma.passwordReset.findFirst({
      where: { email: 'admin@pyrotype.local' },
    });
    const firstToken = firstRecord!.token;

    const app2 = createTestApp();
    await request(app2)
      .post('/api/auth/password')
      .send({ email: 'admin@pyrotype.local' });

    const records = await prisma.passwordReset.findMany({
      where: { email: 'admin@pyrotype.local' },
    });

    // Should only have one token (old one deleted)
    expect(records.length).toBe(1);
    // Token should be different
    expect(records[0].token).not.toBe(firstToken);
  });
});

describe('POST /api/auth/password/reset', () => {
  it('should reset password with valid token', async () => {
    // Create token directly in DB to avoid rate limiting
    const token = await createResetToken('admin@pyrotype.local');

    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password/reset')
      .send({
        email: 'admin@pyrotype.local',
        token,
        password: 'NewSecurePassword123!',
        passwordConfirmation: 'NewSecurePassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.redirect_to).toBe('/');

    // Verify the old password no longer works
    const app2 = createTestApp();
    const loginWithOldRes = await request(app2)
      .post('/api/auth/login')
      .send({ user: 'admin', password: 'password' });
    expect(loginWithOldRes.status).toBe(422);

    // Verify the new password works
    const app3 = createTestApp();
    const loginWithNewRes = await request(app3)
      .post('/api/auth/login')
      .send({ user: 'admin', password: 'NewSecurePassword123!' });
    expect(loginWithNewRes.status).toBe(200);

    // Restore password back to 'password' for other tests
    const restoreToken = await createResetToken('admin@pyrotype.local');
    const app4 = createTestApp();
    await request(app4)
      .post('/api/auth/password/reset')
      .send({
        email: 'admin@pyrotype.local',
        token: restoreToken,
        password: 'password',
        passwordConfirmation: 'password',
      });
  });

  it('should reject reset with invalid token', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password/reset')
      .send({
        email: 'admin@pyrotype.local',
        token: 'completely-invalid-token',
        password: 'NewPassword123!',
        passwordConfirmation: 'NewPassword123!',
      });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].detail).toContain('token is invalid');
  });

  it('should reject reset with mismatched passwords', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password/reset')
      .send({
        email: 'admin@pyrotype.local',
        token: 'some-token',
        password: 'NewPassword123!',
        passwordConfirmation: 'DifferentPassword456!',
      });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].detail).toContain('confirmation does not match');
  });

  it('should reject reset with missing required fields', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password/reset')
      .send({});

    expect(res.status).toBe(422);
  });

  it('should reject reset with missing email', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password/reset')
      .send({
        token: 'some-token',
        password: 'NewPassword123!',
        passwordConfirmation: 'NewPassword123!',
      });

    expect(res.status).toBe(422);
  });

  it('should reject reset with missing token', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password/reset')
      .send({
        email: 'admin@pyrotype.local',
        password: 'NewPassword123!',
        passwordConfirmation: 'NewPassword123!',
      });

    expect(res.status).toBe(422);
  });

  it('should reject reset with password shorter than 8 characters', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/password/reset')
      .send({
        email: 'admin@pyrotype.local',
        token: 'some-token',
        password: 'short',
        passwordConfirmation: 'short',
      });

    expect(res.status).toBe(422);
  });

  it('should delete reset token after successful use', async () => {
    const token = await createResetToken('admin@pyrotype.local');

    const app = createTestApp();
    await request(app)
      .post('/api/auth/password/reset')
      .send({
        email: 'admin@pyrotype.local',
        token,
        password: 'password',
        passwordConfirmation: 'password',
      });

    // Token should be deleted
    const remainingTokens = await prisma.passwordReset.findMany({
      where: { email: 'admin@pyrotype.local' },
    });
    expect(remainingTokens.length).toBe(0);
  });

  it('should reject reuse of same reset token', async () => {
    const token = await createResetToken('admin@pyrotype.local');

    // First use - succeeds
    const app1 = createTestApp();
    const firstRes = await request(app1)
      .post('/api/auth/password/reset')
      .send({
        email: 'admin@pyrotype.local',
        token,
        password: 'password',
        passwordConfirmation: 'password',
      });
    expect(firstRes.status).toBe(200);

    // Second use - should fail (token deleted)
    const app2 = createTestApp();
    const secondRes = await request(app2)
      .post('/api/auth/password/reset')
      .send({
        email: 'admin@pyrotype.local',
        token,
        password: 'password',
        passwordConfirmation: 'password',
      });
    expect(secondRes.status).toBe(422);
  });
});
