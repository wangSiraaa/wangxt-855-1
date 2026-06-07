const { v4: uuidv4 } = require('uuid');
const { run, get, all, serialize } = require('../utils/db');

const STATUS_FLOW = {
  draft: ['submitted'],
  submitted: ['authorization_pending', 'authorization_rejected'],
  authorization_pending: ['processing', 'authorization_rejected'],
  authorization_rejected: ['submitted'],
  processing: ['processed'],
  processed: ['review_pending'],
  review_pending: ['review_rejected', 'stamped'],
  review_rejected: ['processed'],
  stamped: ['archived'],
  archived: []
};

class ConfirmationModel {
  static generateNo() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BC-${year}${month}${day}-${random}`;
  }

  static async create(data, userId) {
    const confirmationNo = this.generateNo();
    const result = await run(
      `INSERT INTO confirmations 
       (confirmation_no, firm_id, client_id, bank_id, account_id, audit_period, 
        confirmation_type, content, has_authorization, remarks, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        confirmationNo,
        data.firm_id,
        data.client_id,
        data.bank_id,
        data.account_id,
        data.audit_period,
        data.confirmation_type || 'balance',
        data.content,
        data.has_authorization ? 1 : 0,
        data.remarks || '',
        userId
      ]
    );
    
    await this.logAction(result.lastID, 'create', null, 'draft', userId, '创建询证函');
    
    return await this.findById(result.lastID);
  }

  static async findById(id) {
    return get(`
      SELECT c.*, 
             u_firm.name as firm_name,
             u_created.name as created_name,
             ac.name as client_name,
             b.name as bank_name,
             b.branch as bank_branch,
             ba.account_no,
             ba.account_name
      FROM confirmations c
      LEFT JOIN users u_firm ON c.firm_id = u_firm.id
      LEFT JOIN users u_created ON c.created_by = u_created.id
      LEFT JOIN audit_clients ac ON c.client_id = ac.id
      LEFT JOIN banks b ON c.bank_id = b.id
      LEFT JOIN bank_accounts ba ON c.account_id = ba.id
      WHERE c.id = ?
    `, [id]);
  }

  static async findByNo(confirmationNo) {
    return get('SELECT * FROM confirmations WHERE confirmation_no = ?', [confirmationNo]);
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT c.*, 
             u_firm.name as firm_name,
             ac.name as client_name,
             b.name as bank_name,
             b.branch as bank_branch
      FROM confirmations c
      LEFT JOIN users u_firm ON c.firm_id = u_firm.id
      LEFT JOIN audit_clients ac ON c.client_id = ac.id
      LEFT JOIN banks b ON c.bank_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.firm_id) {
      sql += ' AND c.firm_id = ?';
      params.push(filters.firm_id);
    }
    if (filters.client_id) {
      sql += ' AND c.client_id = ?';
      params.push(filters.client_id);
    }
    if (filters.bank_id) {
      sql += ' AND c.bank_id = ?';
      params.push(filters.bank_id);
    }
    if (filters.status) {
      sql += ' AND c.status = ?';
      params.push(filters.status);
    }
    if (filters.has_authorization !== undefined) {
      sql += ' AND c.has_authorization = ?';
      params.push(filters.has_authorization ? 1 : 0);
    }

    sql += ' ORDER BY c.created_at DESC';

    return all(sql, params);
  }

  static async updateStatus(id, newStatus, operatorId, remarks = '') {
    const current = await get('SELECT status FROM confirmations WHERE id = ?', [id]);
    if (!current) {
      throw new Error('询证函不存在');
    }

    const allowedTransitions = STATUS_FLOW[current.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`无法从状态 ${current.status} 转换到 ${newStatus}`);
    }

    const result = await run(
      'UPDATE confirmations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    );

    await this.logAction(id, 'status_change', current.status, newStatus, operatorId, remarks);

    return result;
  }

  static async updateHasAuthorization(id, hasAuth, operatorId) {
    return run(
      'UPDATE confirmations SET has_authorization = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hasAuth ? 1 : 0, id]
    );
  }

  static async logAction(confirmationId, action, statusFrom, statusTo, operatorId, remarks = '') {
    return run(
      `INSERT INTO confirmation_logs 
       (confirmation_id, action, status_from, status_to, operator_id, remarks) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [confirmationId, action, statusFrom, statusTo, operatorId, remarks]
    );
  }

  static async getLogs(confirmationId) {
    return all(`
      SELECT cl.*, u.name as operator_name
      FROM confirmation_logs cl
      LEFT JOIN users u ON cl.operator_id = u.id
      WHERE cl.confirmation_id = ?
      ORDER BY cl.created_at DESC
    `, [confirmationId]);
  }

  static async checkAuthorization(confirmationId) {
    const result = await get(`
      SELECT c.has_authorization, a.id as auth_id, a.status as auth_status
      FROM confirmations c
      LEFT JOIN authorizations a ON c.id = a.confirmation_id AND a.status = 'valid'
      WHERE c.id = ?
    `, [confirmationId]);

    if (!result) {
      return { authorized: false, reason: '询证函不存在' };
    }

    if (!result.has_authorization) {
      return { authorized: false, reason: '未上传授权书' };
    }

    if (!result.auth_id) {
      return { authorized: false, reason: '授权书不存在或已失效' };
    }

    return { authorized: true, authId: result.auth_id };
  }
}

module.exports = ConfirmationModel;
