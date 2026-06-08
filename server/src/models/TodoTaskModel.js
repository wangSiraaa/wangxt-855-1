const { run, get, all } = require('../utils/db');

class TodoTaskModel {
  static async create(data, creatorId) {
    const result = await run(
      `INSERT INTO todo_tasks 
       (task_type, task_title, task_description, confirmation_id, 
        assignee_role, assignee_id, priority, due_date, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.task_type,
        data.task_title,
        data.task_description || '',
        data.confirmation_id,
        data.assignee_role,
        data.assignee_id || null,
        data.priority || 'medium',
        data.due_date || null,
        creatorId
      ]
    );
    return await this.findById(result.lastID);
  }

  static async findById(id) {
    return get(`
      SELECT t.*,
             c.confirmation_no,
             c.status as confirmation_status,
             u_creator.name as creator_name,
             u_assignee.name as assignee_name,
             u_completed.name as completed_name
      FROM todo_tasks t
      LEFT JOIN confirmations c ON t.confirmation_id = c.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
      LEFT JOIN users u_completed ON t.completed_by = u_completed.id
      WHERE t.id = ?
    `, [id]);
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT t.*,
             c.confirmation_no,
             c.status as confirmation_status,
             c.firm_id,
             c.client_id,
             c.bank_id,
             u_creator.name as creator_name,
             u_assignee.name as assignee_name,
             u_completed.name as completed_name
      FROM todo_tasks t
      LEFT JOIN confirmations c ON t.confirmation_id = c.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
      LEFT JOIN users u_completed ON t.completed_by = u_completed.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.confirmation_id) {
      sql += ' AND t.confirmation_id = ?';
      params.push(filters.confirmation_id);
    }
    if (filters.task_type) {
      sql += ' AND t.task_type = ?';
      params.push(filters.task_type);
    }
    if (filters.status) {
      sql += ' AND t.status = ?';
      params.push(filters.status);
    }
    if (filters.assignee_role) {
      sql += ' AND t.assignee_role = ?';
      params.push(filters.assignee_role);
    }
    if (filters.assignee_id) {
      sql += ' AND t.assignee_id = ?';
      params.push(filters.assignee_id);
    }
    if (filters.priority) {
      sql += ' AND t.priority = ?';
      params.push(filters.priority);
    }

    sql += ' ORDER BY t.priority DESC, t.created_at DESC';

    return all(sql, params);
  }

  static async findMyTasks(userId, userRole, filters = {}) {
    let sql = `
      SELECT t.*,
             c.confirmation_no,
             c.status as confirmation_status,
             c.firm_id,
             c.client_id,
             c.bank_id,
             ac.name as client_name,
             b.name as bank_name,
             u_creator.name as creator_name,
             u_assignee.name as assignee_name,
             u_completed.name as completed_name
      FROM todo_tasks t
      LEFT JOIN confirmations c ON t.confirmation_id = c.id
      LEFT JOIN audit_clients ac ON c.client_id = ac.id
      LEFT JOIN banks b ON c.bank_id = b.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
      LEFT JOIN users u_completed ON t.completed_by = u_completed.id
      WHERE (t.assignee_id = ? OR t.assignee_role = ?)
    `;
    const params = [userId, userRole];

    if (filters.status) {
      sql += ' AND t.status = ?';
      params.push(filters.status);
    }
    if (filters.task_type) {
      sql += ' AND t.task_type = ?';
      params.push(filters.task_type);
    }
    if (filters.priority) {
      sql += ' AND t.priority = ?';
      params.push(filters.priority);
    }

    sql += ' ORDER BY t.priority DESC, t.created_at DESC';

    return all(sql, params);
  }

  static async complete(id, operatorId, remark = '') {
    return run(
      `UPDATE todo_tasks 
       SET status = 'completed', 
           completed_by = ?, 
           completed_at = CURRENT_TIMESTAMP,
           completed_remark = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [operatorId, remark, id]
    );
  }

  static async reject(id, operatorId, remark = '') {
    return run(
      `UPDATE todo_tasks 
       SET status = 'rejected', 
           completed_by = ?, 
           completed_at = CURRENT_TIMESTAMP,
           completed_remark = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [operatorId, remark, id]
    );
  }

  static async updateStatus(id, status, operatorId) {
    return run(
      `UPDATE todo_tasks 
       SET status = ?, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );
  }

  static async cancel(id, operatorId, remark = '') {
    return run(
      `UPDATE todo_tasks 
       SET status = 'cancelled', 
           completed_by = ?, 
           completed_remark = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [operatorId, remark, id]
    );
  }

  static async delete(id) {
    return run('DELETE FROM todo_tasks WHERE id = ?', [id]);
  }

  static async countPendingByRole(role) {
    const result = await get(
      'SELECT COUNT(*) as count FROM todo_tasks WHERE status = ? AND assignee_role = ?',
      ['pending', role]
    );
    return result?.count || 0;
  }
}

module.exports = TodoTaskModel;
