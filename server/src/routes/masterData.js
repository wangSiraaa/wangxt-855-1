const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { all, get } = require('../utils/db');

const router = express.Router();

router.use(authenticateToken);

router.get('/clients', async (req, res) => {
  try {
    const clients = await all('SELECT * FROM audit_clients ORDER BY id');
    res.json({ success: true, data: clients });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取客户列表失败' });
  }
});

router.get('/banks', async (req, res) => {
  try {
    const banks = await all('SELECT * FROM banks ORDER BY id');
    res.json({ success: true, data: banks });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取银行列表失败' });
  }
});

router.get('/accounts', async (req, res) => {
  try {
    const { client_id, bank_id } = req.query;
    let sql = `
      SELECT ba.*, ac.name as client_name, b.name as bank_name, b.branch as bank_branch
      FROM bank_accounts ba
      LEFT JOIN audit_clients ac ON ba.client_id = ac.id
      LEFT JOIN banks b ON ba.bank_id = b.id
      WHERE 1=1
    `;
    const params = [];
    
    if (client_id) {
      sql += ' AND ba.client_id = ?';
      params.push(parseInt(client_id));
    }
    if (bank_id) {
      sql += ' AND ba.bank_id = ?';
      params.push(parseInt(bank_id));
    }
    
    sql += ' ORDER BY ba.id';
    
    const accounts = await all(sql, params);
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取账户列表失败' });
  }
});

router.get('/status-map', (req, res) => {
  const statusMap = {
    draft: { label: '草稿', color: '#909399', step: 0 },
    submitted: { label: '已提交', color: '#409EFF', step: 1 },
    authorization_pending: { label: '待授权审核', color: '#E6A23C', step: 2 },
    authorization_rejected: { label: '授权不通过', color: '#F56C6C', step: 2 },
    processing: { label: '处理中', color: '#409EFF', step: 3 },
    processed: { label: '处理完成', color: '#67C23A', step: 3 },
    review_pending: { label: '待复核', color: '#E6A23C', step: 4 },
    review_rejected: { label: '复核不通过', color: '#F56C6C', step: 4 },
    stamped: { label: '已盖章', color: '#67C23A', step: 5 },
    archived: { label: '已归档', color: '#909399', step: 6 }
  };
  
  const roleMap = {
    audit_firm: { label: '会计师事务所', color: '#409EFF' },
    bank_clerk: { label: '银行经办', color: '#67C23A' },
    review_manager: { label: '复核经理', color: '#E6A23C' },
    audit_client: { label: '审计客户', color: '#909399' }
  };
  
  res.json({
    success: true,
    data: {
      status_map: statusMap,
      role_map: roleMap
    }
  });
});

module.exports = router;
