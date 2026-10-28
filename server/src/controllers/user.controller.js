import { User } from '../models/User.js';
import { Dataset } from '../models/Dataset.js';
import { DatasetRow } from '../models/DatasetRow.js';
import { SavedAnalysis } from '../models/SavedAnalysis.js';
import { ActivityLog } from '../models/ActivityLog.js';

export class UserController {
  /**
   * Update name or UI preferences.
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.session.userId;
      const { name, theme } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' }
        });
      }

      if (name && name.trim().length >= 2) {
        user.name = name.trim();
        req.session.userName = user.name;
      }

      if (theme && ['light', 'dark'].includes(theme)) {
        if (!user.preferences) user.preferences = {};
        user.preferences.theme = theme;
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change account password.
   */
  static async updatePassword(req, res, next) {
    try {
      const userId = req.session.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Current password and new password are required.' }
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: { code: 'WEAK_PASSWORD', message: 'New password must be at least 8 characters long.' }
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' }
        });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: { code: 'INCORRECT_CURRENT_PASSWORD', message: 'Incorrect current password.' }
        });
      }

      user.passwordHash = await User.hashPassword(newPassword);
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Permanently delete user account and cascade delete all owned resources.
   */
  static async deleteAccount(req, res, next) {
    try {
      const userId = req.session.userId;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: { code: 'PASSWORD_REQUIRED', message: 'Password is required to confirm account deletion.' }
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' }
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: { code: 'INCORRECT_PASSWORD', message: 'Password confirmation failed.' }
        });
      }

      // Cascading deletion across all collections
      await Promise.all([
        DatasetRow.deleteMany({ ownerId: userId }),
        SavedAnalysis.deleteMany({ ownerId: userId }),
        Dataset.deleteMany({ ownerId: userId }),
        ActivityLog.deleteMany({ ownerId: userId }),
        User.deleteOne({ _id: userId })
      ]);

      // Destroy session
      req.session.destroy(err => {
        if (err) return next(err);
        res.clearCookie('datalens.sid');
        res.clearCookie('XSRF-TOKEN');
        res.status(200).json({
          success: true,
          message: 'Account and all associated datasets permanently deleted.'
        });
      });
    } catch (error) {
      next(error);
    }
  }
}
