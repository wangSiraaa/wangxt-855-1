const { run, get, all } = require('../utils/db');

class ReplyOpinionModel {
  static async create(data, operatorId) {
    const result = await run(
      `INSERT INTO reply_opinions 
       (confirmation_id, opinion_type, content, difference_explanation, 
        attachments, processed_by, review_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.confirmation_id,
        data.opinion_type,
        data.content,
        data.difference_explanation || '',
        data.attachments || '',
        operatorId,
        'pending'
      ]
    );
    return result.lastID;
  }

  static async findById(id) {
    return get(`
      SELECT ro.*, 
             u_process.name as processed_by_name,
             u_review.name as reviewed_by_name,
             c.confirmation_no
      FROM reply_opinions ro
      LEFT JOIN users u_process ON ro.processed_by = u_process.id
      LEFT JOIN users u_review ON ro.reviewed_by = u_review.id
      LEFT JOIN confirmations c ON ro.confirmation_id = c.id
      WHERE ro.id = ?
    `, [id]);
  }

  static async findByConfirmationId(confirmationId) {
    return all(`
      SELECT ro.*, 
             u_process.name as processed_by_name,
             u_review.name as reviewed_by_name
      FROM reply_opinions ro
      LEFT JOIN users u_process ON ro.processed_by = u_process.id
      LEFT JOIN users u_review ON ro.reviewed_by = u_review.id
      WHERE ro.confirmation_id = ?
      ORDER BY ro.created_at DESC
    `, [confirmationId]);
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT ro.*, 
             u_process.name as processed_by_name,
             u_review.name as reviewed_by_name,
             c.confirmation_no
      FROM reply_opinions ro
      LEFT JOIN users u_process ON ro.processed_by = u_process.id
      LEFT JOIN users u_review ON ro.reviewed_by = u_review.id
      LEFT JOIN confirmations c ON ro.confirmation_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.confirmation_id) {
      sql += ' AND ro.confirmation_id = ?';
      params.push(filters.confirmation_id);
    }
    if (filters.opinion_type) {
      sql += ' AND ro.opinion_type = ?';
      params.push(filters.opinion_type);
    }
    if (filters.review_status) {
      sql += ' AND ro.review_status = ?';
      params.push(filters.review_status);
    }
    if (filters.processed_by) {
      sql += ' AND ro.processed_by = ?';
      params.push(filters.processed_by);
    }

    sql += ' ORDER BY ro.created_at DESC';

    return all(sql, params);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    
    if (data.opinion_type) { 
      fields.push('opinion_type = ?'); 
      values.push(data.opinion_type); 
    }
    if (data.content) { 
      fields.push('content = ?'); 
      values.push(data.content); 
    }
    if (data.difference_explanation) { 
      fields.push('difference_explanation = ?'); 
      values.push(data.difference_explanation); 
    }
    if (data.attachments) { 
      fields.push('attachments = ?'); 
      values.push(data.attachments); 
    }

    values.push(id);
    
    return run(
      `UPDATE reply_opinions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async review(id, reviewData, reviewerId) {
    return run(
      `UPDATE reply_opinions 
       SET review_status = ?, review_opinion = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        reviewData.review_status,
        reviewData.review_opinion || '',
        reviewerId,
        id
      ]
    );
  }

  static async delete(id) {
    return run('DELETE FROM reply_opinions WHERE id = ?', [id]);
  }
}

module.exports = ReplyOpinionModel;
