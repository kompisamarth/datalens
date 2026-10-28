import mongoose from 'mongoose';

/**
 * Connect to MongoDB with graceful error handling and retry configuration.
 * @param {string} uri - MongoDB connection string
 * @returns {Promise<mongoose.Connection>}
 */
export async function connectDB(uri) {
  // Reuse existing connection if already connected (vital for serverless environments)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const connectionUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/datalens_studio';

  try {
    const conn = await mongoose.connect(connectionUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB connected successfully to ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
}

/**
 * Gracefully close the MongoDB connection.
 */
export async function closeDB() {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB connection closed gracefully');
  } catch (error) {
    console.error(`[Database Error] Error while closing MongoDB connection: ${error.message}`);
  }
}
