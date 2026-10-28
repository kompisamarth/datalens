import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

let isConnected = false;

/**
 * Vercel Serverless Function entry point.
 * Bridges incoming serverless HTTP requests to the Express application
 * with pooled database connection management.
 */
export default async function handler(req, res) {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('[Vercel Serverless] MongoDB connection error:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_CONNECTION_ERROR',
          message:
            'Unable to connect to database. Please ensure MONGODB_URI is configured in Vercel environment variables.'
        }
      });
    }
  }

  return app(req, res);
}
