import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';

describe('Authentication & Session Integration Tests', () => {
  const testUser = {
    name: 'Auth Test User',
    email: `test_auth_${Date.now()}@example.com`,
    password: 'Password123'
  };

  let authCookie = null;
  let csrfToken = null;

  before(async () => {
    await connectDB();
  });

  after(async () => {
    await User.deleteMany({ email: { $regex: /^test_auth_/ } });
    await closeDB();
    setTimeout(() => process.exit(0), 100);
  });

  test('POST /api/v1/auth/register — Successfully registers new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, testUser.email.toLowerCase());
    assert.equal(res.body.data.user.passwordHash, undefined, 'Password hash must never be returned');
    assert.ok(res.body.data.csrfToken, 'CSRF token must be returned');

    // Extract session cookie
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'Session cookie must be set upon registration');
  });

  test('POST /api/v1/auth/register — Rejects duplicate registration with 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'EMAIL_ALREADY_EXISTS');
  });

  test('POST /api/v1/auth/register — Rejects weak password (< 8 chars) with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Short Password User',
        email: `short_${Date.now()}@example.com`,
        password: 'pass'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'WEAK_PASSWORD');
  });

  test('POST /api/v1/auth/login — Successfully logs in and sets session cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.csrfToken);

    // Save cookie for subsequent tests
    const cookies = res.headers['set-cookie'];
    authCookie = cookies.find(c => c.startsWith('datalens.sid='));
    csrfToken = res.body.data.csrfToken;
    assert.ok(authCookie, 'Expected datalens.sid cookie');
  });

  test('POST /api/v1/auth/login — Rejects incorrect password with 401 generic error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword123'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('GET /api/v1/auth/me — Retrieves current user using session cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, testUser.email.toLowerCase());
    assert.equal(res.body.data.user.passwordHash, undefined);
  });

  test('POST /api/v1/auth/logout — Invalidate session and clears cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify session is now invalid
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', authCookie);

    assert.equal(meRes.status, 401);
  });
});
