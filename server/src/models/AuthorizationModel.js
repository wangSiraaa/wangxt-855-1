const { run, get, all } = require('../utils/db');

class AuthorizationModel {
  static async create(data, operatorId) {
    const result = await run(
      `INSERT INTO authorizations 
       (confirmation_id, client_id, authorized_by, authorization_date, authorization_content, authorization_file, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.confirmation_id,
        data.client_id,
        operatorId,
        data.authorization_date,
        data.authorization_content,
        data.authorization_file || '',
        data.status || 'valid'
      ]
    );
    return result.lastID;
  }

  static async findById(id) {
    return get(`
      SELECT a.*, 
             u.name as authorized_by_name,
             ac.name as client_name,
             c.confirmation_no
      FROM authorizations a
      LEFT JOIN users u ON a.authorized_by = u.id
      LEFT JOIN audit_clients ac ON a.client_id = ac.id
      LEFT JOIN confirmations c ON a.confirmation_id = c.id
      WHERE a.id = ?
    `, [id]);
  }

  static async findByConfirmationId(confirmationId) {
    return all(`
      SELECT a.*, 
             u.name as authorized_by_name,
             ac.name as client_name
      FROM authorizations a
      LEFT JOIN users u ON a.authorized_by = u.id
      LEFT JOIN audit_clients ac ON a.client_id = ac.id
      WHERE a.confirmation_id = ?
      ORDER BY a.created_at DESC
    `, [confirmationId]);
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT a.*, 
             u.name as authorized_by_name,
             ac.name as client_name,
             c.confirmation_no
      FROM authorizations a
      LEFT JOIN users u ON a.authorized_by = u.id
      LEFT JOIN audit_clients ac ON a.client_id = ac.id
      LEFT JOIN confirmations c ON a.confirmation_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.client_id) {
      sql += ' AND a.client_id = ?';
      params.push(filters.client_id);
    }
    if (filters.confirmation_id) {
      sql += ' AND a.confirmation_id = ?';
      params.push(filters.confirmation_id);
    }
    if (filters.status) {
      sql += ' AND a.status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY a.created_at DESC';

    return all(sql, params);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    
    if (data.authorization_date) { 
      fields.push('authorization_date = ?'); 
      values.push(data.authorization_date); 
    }
    if (data.authorization_content) { 
      fields.push('authorization_content = ?'); 
      values.push(data.authorization_content); 
    }
    if (data.authorization_file) { 
      fields.push('authorization_file = ?'); 
      values.push(data.authorization_file); 
    }
    if (data.status) { 
      fields.push('status = ?'); 
      values.push(data.status); 
    }

    values.push(id);
    
    return run(
      `UPDATE authorizations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async delete(id) {
    return run('DELETE FROM authorizations WHERE id = ?', [id]);
  }
}

module.exports = AuthorizationModel;
