const { run, get, all } = require('../utils/db');

class AccountDetailModel {
  static async create(data, operatorId) {
    const result = await run(
      `INSERT INTO account_details 
       (confirmation_id, account_id, balance_date, balance_amount, currency, 
        transaction_count, transaction_amount, account_status, interest_rate, 
        overdraft_limit, remarks, processed_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.confirmation_id,
        data.account_id,
        data.balance_date,
        data.balance_amount,
        data.currency || 'CNY',
        data.transaction_count || 0,
        data.transaction_amount || 0,
        data.account_status || 'normal',
        data.interest_rate || 0,
        data.overdraft_limit || 0,
        data.remarks || '',
        operatorId
      ]
    );
    return result.lastID;
  }

  static async findById(id) {
    return get(`
      SELECT ad.*, 
             u.name as processed_by_name,
             ba.account_no,
             ba.account_name,
             ba.account_type,
             b.name as bank_name,
             b.branch as bank_branch,
             ac.name as client_name,
             c.confirmation_no
      FROM account_details ad
      LEFT JOIN users u ON ad.processed_by = u.id
      LEFT JOIN bank_accounts ba ON ad.account_id = ba.id
      LEFT JOIN banks b ON ba.bank_id = b.id
      LEFT JOIN audit_clients ac ON ba.client_id = ac.id
      LEFT JOIN confirmations c ON ad.confirmation_id = c.id
      WHERE ad.id = ?
    `, [id]);
  }

  static async findByConfirmationId(confirmationId) {
    return all(`
      SELECT ad.*, 
             u.name as processed_by_name,
             ba.account_no,
             ba.account_name,
             ba.account_type,
             b.name as bank_name,
             b.branch as bank_branch
      FROM account_details ad
      LEFT JOIN users u ON ad.processed_by = u.id
      LEFT JOIN bank_accounts ba ON ad.account_id = ba.id
      LEFT JOIN banks b ON ba.bank_id = b.id
      WHERE ad.confirmation_id = ?
      ORDER BY ad.created_at DESC
    `, [confirmationId]);
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT ad.*, 
             u.name as processed_by_name,
             ba.account_no,
             ba.account_name,
             b.name as bank_name,
             ac.name as client_name,
             c.confirmation_no
      FROM account_details ad
      LEFT JOIN users u ON ad.processed_by = u.id
      LEFT JOIN bank_accounts ba ON ad.account_id = ba.id
      LEFT JOIN banks b ON ba.bank_id = b.id
      LEFT JOIN audit_clients ac ON ba.client_id = ac.id
      LEFT JOIN confirmations c ON ad.confirmation_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.confirmation_id) {
      sql += ' AND ad.confirmation_id = ?';
      params.push(filters.confirmation_id);
    }
    if (filters.account_id) {
      sql += ' AND ad.account_id = ?';
      params.push(filters.account_id);
    }
    if (filters.balance_date) {
      sql += ' AND ad.balance_date = ?';
      params.push(filters.balance_date);
    }

    sql += ' ORDER BY ad.created_at DESC';

    return all(sql, params);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    
    if (data.balance_date) { 
      fields.push('balance_date = ?'); 
      values.push(data.balance_date); 
    }
    if (data.balance_amount !== undefined) { 
      fields.push('balance_amount = ?'); 
      values.push(data.balance_amount); 
    }
    if (data.currency) { 
      fields.push('currency = ?'); 
      values.push(data.currency); 
    }
    if (data.transaction_count !== undefined) { 
      fields.push('transaction_count = ?'); 
      values.push(data.transaction_count); 
    }
    if (data.transaction_amount !== undefined) { 
      fields.push('transaction_amount = ?'); 
      values.push(data.transaction_amount); 
    }
    if (data.account_status) { 
      fields.push('account_status = ?'); 
      values.push(data.account_status); 
    }
    if (data.interest_rate !== undefined) { 
      fields.push('interest_rate = ?'); 
      values.push(data.interest_rate); 
    }
    if (data.overdraft_limit !== undefined) { 
      fields.push('overdraft_limit = ?'); 
      values.push(data.overdraft_limit); 
    }
    if (data.remarks) { 
      fields.push('remarks = ?'); 
      values.push(data.remarks); 
    }

    values.push(id);
    
    return run(
      `UPDATE account_details SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async delete(id) {
    return run('DELETE FROM account_details WHERE id = ?', [id]);
  }
}

module.exports = AccountDetailModel;
