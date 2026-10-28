import crypto from 'crypto';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';

export class AuthController {
  /**
   * Register a new user account.
   */
  static async register(req, res, next) {
    try {
      const { name, email, password, passwordConfirm } = req.body;

      // Validation
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_NAME', message: 'Name must be at least 2 characters long.' }
        });
      }

      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!email || !emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' }
        });
      }

      if (!password || password.length < 8) {
        return res.status(400).json({
          success: false,
          error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' }
        });
      }

      if (passwordConfirm && password !== passwordConfirm) {
        return res.status(400).json({
          success: false,
          error: { code: 'PASSWORD_MISMATCH', message: 'Passwords do not match.' }
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email address already exists.' }
        });
      }

      // Hash password
      const passwordHash = await User.hashPassword(password);

      // Create user
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        preferences: { theme: 'light' }
      });

      // Establish session with session regeneration
      req.session.regenerate(async err => {
        if (err) return next(err);

        req.session.userId = user._id.toString();
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');

        // Audit log
        await ActivityLog.create({
          ownerId: user._id,
          action: 'USER_REGISTER',
          targetType: 'user',
          targetId: user._id.toString(),
          details: { email: user.email }
        });

        // Save session explicitly before responding to prevent race conditions
        req.session.save(saveErr => {
          if (saveErr) return next(saveErr);

          res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: {
              user: user.toJSON(),
              csrfToken: req.session.csrfToken
            }
          });
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Authenticate user and create session.
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_CREDENTIALS', message: 'Email and password are required.' }
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        // Generic message to prevent user enumeration
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
        });
      }

      // Regenerate session upon successful login to prevent session fixation
      req.session.regenerate(async err => {
        if (err) return next(err);

        req.session.userId = user._id.toString();
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');

        // Audit log
        await ActivityLog.create({
          ownerId: user._id,
          action: 'USER_LOGIN',
          targetType: 'user',
          targetId: user._id.toString()
        });

        // Save session explicitly before responding to prevent race conditions
        req.session.save(saveErr => {
          if (saveErr) return next(saveErr);

          res.status(200).json({
            success: true,
            message: 'Logged in successfully.',
            data: {
              user: user.toJSON(),
              csrfToken: req.session.csrfToken
            }
          });
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log out and destroy session.
   */
  static async logout(req, res, next) {
    try {
      const userId = req.session ? req.session.userId : null;

      if (userId) {
        await ActivityLog.create({
          ownerId: userId,
          action: 'USER_LOGOUT',
          targetType: 'user',
          targetId: userId
        });
      }

      req.session.destroy(err => {
        if (err) return next(err);

        res.clearCookie('datalens.sid');
        res.clearCookie('XSRF-TOKEN');

        res.status(200).json({
          success: true,
          message: 'Logged out successfully.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user details and CSRF token.
   */
  static async getCurrentUser(req, res, next) {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' }
        });
      }

      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User session invalid.' }
        });
      }

      // Ensure CSRF token exists
      if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      }

      res.status(200).json({
        success: true,
        data: {
          user: user.toJSON(),
          csrfToken: req.session.csrfToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get CSRF token.
   */
  static getCsrfToken(req, res, next) {
    if (!req.session) {
      return res.status(200).json({ success: true, data: { csrfToken: null } });
    }

    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      return req.session.save(err => {
        if (err) return next(err);
        res.status(200).json({
          success: true,
          data: {
            csrfToken: req.session.csrfToken
          }
        });
      });
    }

    res.status(200).json({
      success: true,
      data: {
        csrfToken: req.session.csrfToken
      }
    });
  }
}
