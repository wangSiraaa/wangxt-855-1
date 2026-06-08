require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const confirmationRoutes = require('./routes/confirmations');
const authorizationRoutes = require('./routes/authorizations');
const accountDetailRoutes = require('./routes/accountDetails');
const replyOpinionRoutes = require('./routes/replyOpinions');
const stampRecordRoutes = require('./routes/stampRecords');
const masterDataRoutes = require('./routes/masterData');
const todoTaskRoutes = require('./routes/todoTasks');

const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    name: '银行函证回函协同系统 API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      confirmations: '/api/confirmations',
      authorizations: '/api/authorizations',
      account_details: '/api/account-details',
      reply_opinions: '/api/reply-opinions',
      stamp_records: '/api/stamp-records',
      master_data: '/api/master',
      todo_tasks: '/api/todo-tasks'
    }
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/confirmations', confirmationRoutes);
app.use('/api/authorizations', authorizationRoutes);
app.use('/api/account-details', accountDetailRoutes);
app.use('/api/reply-opinions', replyOpinionRoutes);
app.use('/api/stamp-records', stampRecordRoutes);
app.use('/api/master', masterDataRoutes);
app.use('/api/todo-tasks', todoTaskRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  银行函证回函协同系统 API 服务');
  console.log('========================================');
  console.log('');
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`API 文档: http://localhost:${PORT}/`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('测试账号：');
  console.log('  会计师事务所: audit_firm / 123456');
  console.log('  银行经办:     bank_clerk / 123456');
  console.log('  复核经理:     review_manager / 123456');
  console.log('  审计客户:     audit_client / 123456');
  console.log('');
});

module.exports = app;
