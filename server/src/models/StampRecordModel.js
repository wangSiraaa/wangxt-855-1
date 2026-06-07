const { run, get, all } = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

class StampRecordModel {
  static generateSignature() {
    return uuidv4().replace(/-/g, '').toUpperCase();
  }

  static async create(data, operatorId) {
    const digitalSignature = this.generateSignature();
    const result = await run(
      `INSERT INTO stamp_records 
       (confirmation_id, reply_id, stamp_type, stamp_date, stamped_by, 
        stamp_location, digital_signature, stamp_image) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.confirmation_id,
        data.reply_id,
        data.stamp_type,
        new Date().toISOString(),
        operatorId,
        data.stamp_location || '北京',
        digitalSignature,
        data.stamp_image || ''
      ]
    );
    return { id: result.lastID, digital_signature: digitalSignature };
  }

  static async findById(id) {
    return get(`
      SELECT sr.*, 
             u.name as stamped_by_name,
             c.confirmation_no,
             ro.opinion_type
      FROM stamp_records sr
      LEFT JOIN users u ON sr.stamped_by = u.id
      LEFT JOIN confirmations c ON sr.confirmation_id = c.id
      LEFT JOIN reply_opinions ro ON sr.reply_id = ro.id
      WHERE sr.id = ?
    `, [id]);
  }

  static async findByConfirmationId(confirmationId) {
    return all(`
      SELECT sr.*, 
             u.name as stamped_by_name,
             ro.opinion_type
      FROM stamp_records sr
      LEFT JOIN users u ON sr.stamped_by = u.id
      LEFT JOIN reply_opinions ro ON sr.reply_id = ro.id
      WHERE sr.confirmation_id = ?
      ORDER BY sr.created_at DESC
    `, [confirmationId]);
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT sr.*, 
             u.name as stamped_by_name,
             c.confirmation_no,
             ro.opinion_type
      FROM stamp_records sr
      LEFT JOIN users u ON sr.stamped_by = u.id
      LEFT JOIN confirmations c ON sr.confirmation_id = c.id
      LEFT JOIN reply_opinions ro ON sr.reply_id = ro.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.confirmation_id) {
      sql += ' AND sr.confirmation_id = ?';
      params.push(filters.confirmation_id);
    }
    if (filters.reply_id) {
      sql += ' AND sr.reply_id = ?';
      params.push(filters.reply_id);
    }
    if (filters.stamp_type) {
      sql += ' AND sr.stamp_type = ?';
      params.push(filters.stamp_type);
    }
    if (filters.stamped_by) {
      sql += ' AND sr.stamped_by = ?';
      params.push(filters.stamped_by);
    }

    sql += ' ORDER BY sr.created_at DESC';

    return all(sql, params);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    
    if (data.stamp_type) { 
      fields.push('stamp_type = ?'); 
      values.push(data.stamp_type); 
    }
    if (data.stamp_location) { 
      fields.push('stamp_location = ?'); 
      values.push(data.stamp_location); 
    }
    if (data.stamp_image) { 
      fields.push('stamp_image = ?'); 
      values.push(data.stamp_image); 
    }

    values.push(id);
    
    return run(
      `UPDATE stamp_records SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async delete(id) {
    return run('DELETE FROM stamp_records WHERE id = ?', [id]);
  }

  static async verifySignature(digitalSignature) {
    return get('SELECT * FROM stamp_records WHERE digital_signature = ?', [digitalSignature]);
  }
}

module.exports = StampRecordModel;
