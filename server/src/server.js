import dotenv from 'dotenv';
import app from './app.js';
import { connectDB, closeDB } from './config/db.js';

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function bootstrap() {
  try {
    // Connect to MongoDB
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 DataLens Studio Server running at http://localhost:${PORT}`);
      console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API V1: http://localhost:${PORT}/api/v1/health`);
      console.log('====================================================');
    });

    // Graceful Shutdown
    const shutdown = async signal => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await closeDB();
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[Server Error] Startup failed:', error);
    process.exit(1);
  }
}

bootstrap();
