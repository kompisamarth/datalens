import session from 'express-session';
import MongoStore from 'connect-mongo';

/**
 * Configure express-session with MongoDB-backed persistent session store.
 * @param {string} mongoUri - MongoDB connection URI
 * @returns {Function} Express session middleware
 */
export function configureSession(mongoUri) {
  const uri = mongoUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/datalens_studio';
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.SESSION_SECRET || 'datalens_default_dev_session_secret_32chars';
  const maxAge = parseInt(process.env.SESSION_MAX_AGE_MS, 10) || 1000 * 60 * 60 * 24; // 24 hours

  const store = MongoStore.create({
    mongoUrl: uri,
    collectionName: 'sessions',
    ttl: maxAge / 1000,
    autoRemove: 'native',
    touchAfter: 24 * 3600 // lazy session update
  });

  return session({
    name: 'datalens.sid',
    secret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/'
    }
  });
}
