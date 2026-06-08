const fs = require('fs');
const path = require('path');
const { getDB } = require('../utils/db');

class HealthController {
  static async check(req, res) {
    try {
      const dbPath = path.join(__dirname, '../../data/bank_confirmation.db');
      
      const dbExists = fs.existsSync(dbPath);
      
      if (!dbExists) {
        const health = {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            database: {
              status: 'down',
              healthy: false,
              error: '数据库文件不存在，健康检查需连上数据库'
            },
            api: {
              status: 'up'
            }
          },
          environment: {
            node_env: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 3001
          }
        };
        
        return res.status(503).json({
          success: false,
          message: '健康检查需连上数据库',
          data: health
        });
      }
      
      const db = getDB();

      const dbCheck = await new Promise((resolve) => {
        db.get('SELECT 1 as health_check', (err, row) => {
          if (err) {
            resolve({
              healthy: false,
              error: err.message
            });
          } else {
            resolve({
              healthy: true,
              result: row
            });
          }
        });
      });

      const health = {
        status: dbCheck.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: {
            status: dbCheck.healthy ? 'up' : 'down',
            ...dbCheck
          },
          api: {
            status: 'up'
          }
        },
        environment: {
          node_env: process.env.NODE_ENV || 'development',
          port: process.env.PORT || 3001
        }
      };

      const statusCode = dbCheck.healthy ? 200 : 503;

      res.status(statusCode).json({
        success: dbCheck.healthy,
        message: dbCheck.healthy ? '系统运行正常' : '健康检查需连上数据库',
        data: health
      });
    } catch (err) {
      console.error('健康检查失败:', err);
      res.status(503).json({
        success: false,
        message: '健康检查需连上数据库',
        error: err.message,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: err.message
        }
      });
    }
  }

  static async ready(req, res) {
    try {
      const db = getDB();

      const tableCheck = await new Promise((resolve) => {
        db.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'confirmations', 'authorizations')",
          (err, rows) => {
            if (err) {
              resolve(false);
            } else {
              resolve(rows.length === 3);
            }
          }
        );
      });

      if (!tableCheck) {
        return res.status(503).json({
          success: false,
          message: '数据库表未初始化',
          ready: false
        });
      }

      res.json({
        success: true,
        message: '服务已就绪',
        ready: true
      });
    } catch (err) {
      res.status(503).json({
        success: false,
        message: '服务未就绪',
        ready: false,
        error: err.message
      });
    }
  }

  static async info(req, res) {
    try {
      const packageJson = require('../../package.json');

      res.json({
        success: true,
        data: {
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description,
          node_version: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          memory: process.memoryUsage(),
          cwd: process.cwd()
        }
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: '获取系统信息失败',
        error: err.message
      });
    }
  }
}

module.exports = HealthController;
