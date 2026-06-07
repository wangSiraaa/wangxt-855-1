const bcrypt = require('bcryptjs');
const Joi = require('joi');
const UserModel = require('../models/UserModel');
const { generateToken } = require('../middleware/auth');

class AuthController {
  static loginSchema = Joi.object({
    username: Joi.string().required().messages({
      'string.empty': '用户名不能为空',
      'any.required': '用户名是必填项'
    }),
    password: Joi.string().required().messages({
      'string.empty': '密码不能为空',
      'any.required': '密码是必填项'
    })
  });

  static async login(req, res) {
    try {
      const { error, value } = AuthController.loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { username, password } = value;

      const user = await UserModel.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: '账户已被禁用，请联系管理员'
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      const token = generateToken(user);

      res.json({
        success: true,
        message: '登录成功',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            organization: user.organization
          }
        }
      });
    } catch (err) {
      console.error('登录失败:', err);
      res.status(500).json({
        success: false,
        message: '登录失败，请稍后重试'
      });
    }
  }

  static async getCurrentUser(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (err) {
      console.error('获取用户信息失败:', err);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败'
      });
    }
  }

  static async logout(req, res) {
    res.json({
      success: true,
      message: '登出成功'
    });
  }
}

module.exports = AuthController;
