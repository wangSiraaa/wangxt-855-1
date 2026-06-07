const { run, get, all } = require('../utils/db');

class UserModel {
  static async findByUsername(username) {
    return get('SELECT * FROM users WHERE username = ?', [username]);
  }

  static async findById(id) {
    return get(
      'SELECT id, username, name, role, organization, phone, email, status, created_at FROM users WHERE id = ?',
      [id]
    );
  }

  static async findByRole(role) {
    return all(
      'SELECT id, username, name, role, organization, phone, email, status FROM users WHERE role = ? ORDER BY id',
      [role]
    );
  }

  static async findAll() {
    return all(
      'SELECT id, username, name, role, organization, phone, email, status, created_at FROM users ORDER BY id'
    );
  }

  static async create(userData) {
    const { username, password, name, role, organization, phone, email } = userData;
    const result = await run(
      'INSERT INTO users (username, password, name, role, organization, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, password, name, role, organization, phone, email]
    );
    return result.lastID;
  }

  static async update(id, userData) {
    const fields = [];
    const values = [];
    
    if (userData.name) { fields.push('name = ?'); values.push(userData.name); }
    if (userData.role) { fields.push('role = ?'); values.push(userData.role); }
    if (userData.organization) { fields.push('organization = ?'); values.push(userData.organization); }
    if (userData.phone) { fields.push('phone = ?'); values.push(userData.phone); }
    if (userData.email) { fields.push('email = ?'); values.push(userData.email); }
    if (userData.status) { fields.push('status = ?'); values.push(userData.status); }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    return run(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async updatePassword(id, password) {
    return run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [password, id]
    );
  }
}

module.exports = UserModel;
