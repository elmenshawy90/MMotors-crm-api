import User from '../models/User.js';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyToken } from '../utils/helpers.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { blacklistToken } from '../middleware/tokenBlacklist.js';

class AuthController {
  async register(req, res) {
    try {
      const { email, password, first_name, last_name, phone, role, branch_id } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        first_name,
        last_name,
        phone,
        role: role || 'viewer',
        branch_id,
        status: 'active'
      });
      
      // Generate tokens
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });
      
      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;
      
      logger.info(`User registered: ${user.email}`);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userResponse,
          token,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Check password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Check user status
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }
      
      // Update last login
      await user.update({ last_login: new Date() });
      
      // Generate tokens
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });
      
      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;
      
      logger.info(`User logged in: ${user.email}`);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }
      
      // Verify refresh token
      const decoded = verifyToken(refreshToken, config.jwt.refreshSecret);
      
      // Find user
      const user = await User.findOne({ where: { id: decoded.id } });
      if (!user || user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }
      
      // Generate new tokens
      const newToken = generateToken({ id: user.id, email: user.email, role: user.role });
      const newRefreshToken = generateRefreshToken({ id: user.id });
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { first_name, last_name, phone, avatar } = req.body;
      
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      await user.update({
        first_name: first_name || user.first_name,
        last_name: last_name || user.last_name,
        phone: phone || user.phone,
        avatar: avatar || user.avatar
      });
      
      const userResponse = user.toJSON();
      delete userResponse.password;
      
      logger.info(`Profile updated: ${user.email}`);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: userResponse
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Verify current password
      const isPasswordValid = await comparePassword(current_password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(new_password);
      
      await user.update({ password: hashedPassword });
      
      logger.info(`Password changed: ${user.email}`);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }

  async logout(req, res) {
    try {
      // أضف الـ access token للقائمة السوداء فوراً — لن يُقبل في أي طلب لاحق
      if (req.token && req.tokenDecoded?.exp) {
        blacklistToken(req.token, req.tokenDecoded.exp);
      }

      logger.info(`User logged out: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  async getAllUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      logger.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users'
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      // Accept both camelCase (from frontend) and snake_case
      const {
        first_name, last_name, phone, email, role, branch_id, status,
        firstName, lastName, branchId, roleId
      } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Normalize enum values to lowercase (DB uses lowercase, frontend may send capitalized)
      const normalizeStatus = (s) => s ? s.toLowerCase() : null;
      const normalizeRole = (r) => r ? r.toLowerCase().replace(' ', '_') : null;

      const updateData = {};

      const fn = first_name || firstName;
      if (fn) updateData.first_name = fn;

      const ln = last_name || lastName;
      if (ln) updateData.last_name = ln;

      if (phone !== undefined) updateData.phone = phone || null;
      if (email) updateData.email = email;

      const resolvedRole = normalizeRole(role);
      if (resolvedRole) updateData.role = resolvedRole;

      if (roleId) updateData.role_id = roleId;

      const bid = branch_id || branchId;
      if (bid) updateData.branch_id = bid;

      const resolvedStatus = normalizeStatus(status);
      if (resolvedStatus) updateData.status = resolvedStatus;

      await user.update(updateData);

      // Reload to get fresh data
      await user.reload();
      const userResponse = user.toJSON();
      delete userResponse.password;

      logger.info(`User updated: ${user.email}`);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: userResponse
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.destroy();

      logger.info(`User deleted: ${user.email}`);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }
}

export default new AuthController();
