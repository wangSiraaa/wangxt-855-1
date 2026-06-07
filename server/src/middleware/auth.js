const jwt = require('jsonwebtoken');
const { get } = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'bank_confirmation_jwt_secret_2024';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: '未提供认证令牌' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: '认证令牌无效或已过期' 
      });
    }
    req.user = decoded;
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: '未认证' 
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: '权限不足，无法执行此操作' 
      });
    }
    next();
  };
}

async function attachUser(req, res, next) {
  if (req.user) {
    try {
      const user = await get(
        'SELECT id, username, name, role, organization, phone, email FROM users WHERE id = ?',
        [req.user.id]
      );
      req.user = user;
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
  }
  next();
}

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  attachUser
};
