import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Dataset } from '../src/models/Dataset.js';
import { DatasetRow } from '../src/models/DatasetRow.js';
import { SavedAnalysis } from '../src/models/SavedAnalysis.js';
import { ExportService } from '../src/services/export.service.js';

describe('Saved Analysis & Report Export Integration Tests', () => {
  let authCookie = null;
  let csrfToken = null;
  let datasetId = null;
  let analysisId = null;

  before(async () => {
    await connectDB();

    // Register test user
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Analysis Test User',
        email: `analysis_user_${Date.now()}@example.com`,
        password: 'Password123'
      });

    authCookie = res.headers['set-cookie'].find(c => c.startsWith('datalens.sid='));
    csrfToken = res.body.data.csrfToken;

    // Load sample dataset
    const sampleRes = await request(app)
      .post('/api/v1/datasets/sample')
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken);

    datasetId = sampleRes.body.data._id;
  });

  after(async () => {
    if (analysisId) await SavedAnalysis.deleteMany({ datasetId });
    if (datasetId) {
      await Dataset.deleteOne({ _id: datasetId });
      await DatasetRow.deleteMany({ datasetId });
    }
    await User.deleteMany({ email: { $regex: /^analysis_user_/ } });
    await closeDB();
    setTimeout(() => process.exit(0), 100);
  });

  test('POST /api/v1/analyses — Creates a new saved analysis', async () => {
    const res = await request(app)
      .post('/api/v1/analyses')
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        datasetId,
        title: 'Wave 1 Regional Case Study',
        description: 'Testing saved analysis persistence',
        chartType: 'line',
        xAxisColumn: 'Date',
        yAxisColumn: 'ConfirmedCases',
        aggregation: 'sum',
        groupByColumn: 'Region'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data._id);
    analysisId = res.body.data._id;
  });

  test('GET /api/v1/analyses — Retrieves user saved analyses', async () => {
    const res = await request(app)
      .get('/api/v1/analyses')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.length >= 1);
  });

  test('POST /api/v1/analyses/:id/duplicate — Duplicates saved analysis', async () => {
    const res = await request(app)
      .post(`/api/v1/analyses/${analysisId}/duplicate`)
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Wave 1 Regional Case Study (Copy)');
  });

  test('GET /api/v1/analyses/:id/export — Exports standalone HTML report', async () => {
    const res = await request(app)
      .get(`/api/v1/analyses/${analysisId}/export`)
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.text.includes('DataLens Studio — Analytical Report'));
    assert.ok(res.text.includes('Wave 1 Regional Case Study'));
  });

  test('ExportService.escapeCsvCell — Mitigates spreadsheet formula injection', () => {
    const formulaPayload = '=cmd|"/C calc"!A0';
    const escaped = ExportService.escapeCsvCell(formulaPayload);
    assert.ok(
      escaped.startsWith("'") || escaped.startsWith('"\''),
      'Must neutralize formula with leading single quote'
    );

    const plusPayload = '+12345';
    const escapedPlus = ExportService.escapeCsvCell(plusPayload);
    assert.ok(escapedPlus.startsWith("'") || escapedPlus.startsWith('"\''));
  });
});
