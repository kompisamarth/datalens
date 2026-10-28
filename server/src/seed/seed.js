import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Dataset } from '../models/Dataset.js';
import { DatasetRow } from '../models/DatasetRow.js';
import { SavedAnalysis } from '../models/SavedAnalysis.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { CsvService } from '../services/csv.service.js';
import { QualityService } from '../services/quality.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedDemoData() {
  console.log('[Seed] Starting DataLens Studio demonstration data seed...');
  await connectDB();

  // 1. Create or Find Primary Demo Researcher User
  const demoEmail = 'elena.rostova@university.edu';
  let demoUser = await User.findOne({ email: demoEmail });

  if (!demoUser) {
    const passwordHash = await User.hashPassword('Password123');
    demoUser = await User.create({
      name: 'Dr. Elena Rostova',
      email: demoEmail,
      passwordHash,
      preferences: { theme: 'light' }
    });
    console.log(`[Seed] Created primary demo user: ${demoEmail} (Password: Password123)`);
  } else {
    console.log(`[Seed] Using existing demo user: ${demoEmail}`);
  }

  // 2. Read and Parse Built-in Archival COVID-19 Dataset
  const csvPath = path.join(__dirname, 'covid-sample.csv');
  const csvBuffer = fs.readFileSync(csvPath);

  const { headers, rows, rawRowCount } = await CsvService.parseCsvBuffer(csvBuffer, 10000);
  const schemaInfo = CsvService.inferSchema(headers, rows);
  const typedRows = CsvService.castRowValues(rows, schemaInfo);
  const qualitySummary = QualityService.auditDataset(typedRows, schemaInfo);

  // 3. Clean up any existing sample dataset for this user to ensure idempotency
  const existingSample = await Dataset.findOne({
    ownerId: demoUser._id,
    originalFilename: 'covid-sample.csv'
  });

  if (existingSample) {
    console.log('[Seed] Refreshing existing sample dataset...');
    await DatasetRow.deleteMany({ datasetId: existingSample._id });
    await SavedAnalysis.deleteMany({ datasetId: existingSample._id });
    await Dataset.deleteOne({ _id: existingSample._id });
  }

  // 4. Insert Dataset Document
  const dataset = await Dataset.create({
    ownerId: demoUser._id,
    name: 'COVID-19 Archival Global Benchmark (2020)',
    description:
      'Verified historical archival observations across 4 continental regions (March–August 2020). Sourced from WHO / Our World in Data open public repositories for demonstration.',
    originalFilename: 'covid-sample.csv',
    sourceType: 'built-in-sample',
    schemaInfo,
    rowCount: typedRows.length,
    columnCount: headers.length,
    fileSizeBytes: csvBuffer.length,
    qualitySummary,
    isPublicSample: true,
    version: 1
  });

  // 5. Batch Insert Dataset Rows
  const rowDocs = typedRows.map((rowData, index) => ({
    datasetId: dataset._id,
    ownerId: demoUser._id,
    rowIndex: index,
    rowData
  }));

  await DatasetRow.insertMany(rowDocs, { ordered: false });
  console.log(`[Seed] Inserted ${rowDocs.length} dataset rows.`);

  // 6. Insert Default Featured Saved Analysis
  const sampleAnalysis = await SavedAnalysis.create({
    ownerId: demoUser._id,
    datasetId: dataset._id,
    title: 'Continental Wave 1 Trajectory Analysis',
    description:
      'Comparative trajectory of confirmed COVID-19 cases across European, North American, Asian, and South American regions during the 2020 initial surge.',
    chartType: 'line',
    xAxisColumn: 'Date',
    yAxisColumn: 'ConfirmedCases',
    aggregation: 'sum',
    groupByColumn: 'Region',
    filterRules: [],
    chartConfig: {
      theme: 'default',
      showLegend: true
    },
    summaryInsights: [
      {
        title: 'Wave 1 Epicenter Shift',
        text: 'Initial surge was concentrated in Europe and Asia through March 2020 before North and South America recorded massive case accelerations in Q2.',
        type: 'trend'
      },
      {
        title: 'Cases & Mortality Correlation',
        text: 'Confirmed cases and reported deaths exhibit high positive correlation (r > 0.88) across all four tracked continental regions.',
        type: 'correlation'
      }
    ]
  });

  // 7. Record Activity Logs
  await ActivityLog.create([
    {
      ownerId: demoUser._id,
      action: 'DATASET_SAMPLE_LOAD',
      targetType: 'dataset',
      targetId: dataset._id.toString(),
      details: { name: dataset.name, rows: dataset.rowCount }
    },
    {
      ownerId: demoUser._id,
      action: 'ANALYSIS_CREATE',
      targetType: 'analysis',
      targetId: sampleAnalysis._id.toString(),
      details: { title: sampleAnalysis.title, chartType: sampleAnalysis.chartType }
    }
  ]);

  console.log('[Seed] Seed completed successfully!');
  console.log(`[Seed] Demo Credentials: ${demoEmail} / Password123`);
  console.log(`[Seed] Dataset ID: ${dataset._id}`);
  console.log(`[Seed] Analysis ID: ${sampleAnalysis._id}`);
}

// Execute directly if run as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDemoData()
    .then(async () => {
      await closeDB();
      process.exit(0);
    })
    .catch(async err => {
      console.error('[Seed Error] Failed:', err);
      await closeDB();
      process.exit(1);
    });
}
