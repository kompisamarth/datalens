import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

let isConnected = false;

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
            'Unable to connect to database. Please verify MONGODB_URI in Vercel environment variables.'
        }
      });
    }
  }

  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}
