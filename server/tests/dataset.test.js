import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Dataset } from '../src/models/Dataset.js';
import { DatasetRow } from '../src/models/DatasetRow.js';
import { SavedAnalysis } from '../src/models/SavedAnalysis.js';

describe('Dataset CRUD & Ownership Integration Tests', () => {
  let userACookie = null;
  let userACsrf = null;
  let userBCookie = null;
  let userBCsrf = null;
  let datasetId = null;

  before(async () => {
    await connectDB();

    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User A',
        email: `usera_${Date.now()}@example.com`,
        password: 'Password123'
      });
    userACookie = resA.headers['set-cookie'].find(c => c.startsWith('datalens.sid='));
    userACsrf = resA.body.data.csrfToken;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User B',
        email: `userb_${Date.now()}@example.com`,
        password: 'Password123'
      });
    userBCookie = resB.headers['set-cookie'].find(c => c.startsWith('datalens.sid='));
    userBCsrf = resB.body.data.csrfToken;
  });

  after(async () => {
    if (datasetId) {
      await Dataset.deleteOne({ _id: datasetId });
      await DatasetRow.deleteMany({ datasetId });
      await SavedAnalysis.deleteMany({ datasetId });
    }
    await User.deleteMany({ email: { $regex: /^user[ab]_/ } });
    await closeDB();
    setTimeout(() => process.exit(0), 100);
  });

  test('GET /api/v1/datasets — Rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/datasets');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('POST /api/v1/datasets/sample — User A loads COVID-19 sample dataset', async () => {
    const res = await request(app)
      .post('/api/v1/datasets/sample')
      .set('Cookie', userACookie)
      .set('x-csrf-token', userACsrf);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data._id);
    assert.equal(res.body.data.rowCount, 104);
    assert.equal(res.body.data.columnCount, 7);
    datasetId = res.body.data._id;
  });

  test('GET /api/v1/datasets — User A lists datasets and finds imported sample', async () => {
    const res = await request(app)
      .get('/api/v1/datasets')
      .set('Cookie', userACookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.datasets.length >= 1);
    const found = res.body.data.datasets.some(d => d._id === datasetId);
    assert.ok(found, 'Dataset must be listed for owner');
  });

  test('GET /api/v1/datasets/:id/preview — Retrieves paginated preview with search', async () => {
    const res = await request(app)
      .get(`/api/v1/datasets/${datasetId}/preview?page=1&limit=10&search=Europe`)
      .set('Cookie', userACookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.rows.length <= 10);
    assert.ok(res.body.data.rows.length > 0);
    assert.equal(res.body.data.rows[0].rowData.Region, 'Europe');
  });

  test('PATCH /api/v1/datasets/:id — User A updates dataset metadata', async () => {
    const res = await request(app)
      .patch(`/api/v1/datasets/${datasetId}`)
      .set('Cookie', userACookie)
      .set('x-csrf-token', userACsrf)
      .send({
        name: 'Updated COVID-19 Benchmark Title',
        description: 'New custom description'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Updated COVID-19 Benchmark Title');
  });

  test('Cross-Tenant Security: User B cannot access User A private dataset', async () => {
    const res = await request(app)
      .get(`/api/v1/datasets/${datasetId}`)
      .set('Cookie', userBCookie);

    assert.equal(res.status, 404, 'User B must receive 404 Not Found for another users dataset');
    assert.equal(res.body.success, false);
  });

  test('Cross-Tenant Security: User B cannot delete User A dataset', async () => {
    const res = await request(app)
      .delete(`/api/v1/datasets/${datasetId}`)
      .set('Cookie', userBCookie)
      .set('x-csrf-token', userBCsrf);

    assert.equal(res.status, 404, 'User B must not be able to delete another users dataset');
  });

  test('DELETE /api/v1/datasets/:id — User A deletes dataset with cascade', async () => {
    const res = await request(app)
      .delete(`/api/v1/datasets/${datasetId}`)
      .set('Cookie', userACookie)
      .set('x-csrf-token', userACsrf);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify row cleanup
    const remainingRows = await DatasetRow.countDocuments({ datasetId });
    assert.equal(remainingRows, 0, 'All dataset rows must be cascade deleted');
  });
});
