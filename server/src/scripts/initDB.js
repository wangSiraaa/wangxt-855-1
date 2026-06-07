const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'bank_confirmation.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('已删除旧数据库文件');
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('开始创建数据库表...');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('audit_firm', 'bank_clerk', 'review_manager', 'audit_client')),
      organization TEXT,
      phone TEXT,
      email TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('创建users表失败:', err);
    else console.log('✓ users表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      credit_code TEXT,
      legal_representative TEXT,
      address TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('创建audit_clients表失败:', err);
    else console.log('✓ audit_clients表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      branch TEXT NOT NULL,
      code TEXT,
      address TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('创建banks表失败:', err);
    else console.log('✓ banks表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      bank_id INTEGER NOT NULL,
      account_no TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT,
      currency TEXT DEFAULT 'CNY',
      status TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES audit_clients(id),
      FOREIGN KEY (bank_id) REFERENCES banks(id)
    )
  `, (err) => {
    if (err) console.error('创建bank_accounts表失败:', err);
    else console.log('✓ bank_accounts表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS confirmations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      confirmation_no TEXT UNIQUE NOT NULL,
      firm_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      bank_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      audit_period TEXT NOT NULL,
      confirmation_type TEXT DEFAULT 'balance' CHECK(confirmation_type IN ('balance', 'transaction', 'other')),
      content TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN (
        'draft', 'submitted', 'authorization_pending', 'authorization_rejected',
        'processing', 'processed', 'review_pending', 'review_rejected',
        'stamped', 'archived'
      )),
      has_authorization INTEGER DEFAULT 0,
      remarks TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (firm_id) REFERENCES users(id),
      FOREIGN KEY (client_id) REFERENCES audit_clients(id),
      FOREIGN KEY (bank_id) REFERENCES banks(id),
      FOREIGN KEY (account_id) REFERENCES bank_accounts(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建confirmations表失败:', err);
    else console.log('✓ confirmations表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS authorizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      confirmation_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      authorized_by INTEGER NOT NULL,
      authorization_date DATE NOT NULL,
      authorization_content TEXT NOT NULL,
      authorization_file TEXT,
      status TEXT DEFAULT 'valid' CHECK(status IN ('valid', 'invalid', 'expired')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (confirmation_id) REFERENCES confirmations(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES audit_clients(id),
      FOREIGN KEY (authorized_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建authorizations表失败:', err);
    else console.log('✓ authorizations表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS account_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      confirmation_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      balance_date DATE NOT NULL,
      balance_amount DECIMAL(18,2) NOT NULL,
      currency TEXT DEFAULT 'CNY',
      transaction_count INTEGER,
      transaction_amount DECIMAL(18,2),
      account_status TEXT,
      interest_rate DECIMAL(10,4),
      overdraft_limit DECIMAL(18,2),
      remarks TEXT,
      processed_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (confirmation_id) REFERENCES confirmations(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES bank_accounts(id),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建account_details表失败:', err);
    else console.log('✓ account_details表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS reply_opinions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      confirmation_id INTEGER NOT NULL,
      opinion_type TEXT NOT NULL CHECK(opinion_type IN ('consistent', 'inconsistent', 'unable_to_confirm')),
      content TEXT NOT NULL,
      difference_explanation TEXT,
      attachments TEXT,
      processed_by INTEGER NOT NULL,
      reviewed_by INTEGER,
      review_opinion TEXT,
      review_status TEXT DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      FOREIGN KEY (confirmation_id) REFERENCES confirmations(id) ON DELETE CASCADE,
      FOREIGN KEY (processed_by) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建reply_opinions表失败:', err);
    else console.log('✓ reply_opinions表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS stamp_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      confirmation_id INTEGER NOT NULL,
      reply_id INTEGER NOT NULL,
      stamp_type TEXT NOT NULL CHECK(stamp_type IN ('official', 'business', 'special')),
      stamp_date DATETIME NOT NULL,
      stamped_by INTEGER NOT NULL,
      stamp_location TEXT,
      digital_signature TEXT,
      stamp_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (confirmation_id) REFERENCES confirmations(id) ON DELETE CASCADE,
      FOREIGN KEY (reply_id) REFERENCES reply_opinions(id) ON DELETE CASCADE,
      FOREIGN KEY (stamped_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建stamp_records表失败:', err);
    else console.log('✓ stamp_records表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS confirmation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      confirmation_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      status_from TEXT,
      status_to TEXT,
      operator_id INTEGER NOT NULL,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (confirmation_id) REFERENCES confirmations(id) ON DELETE CASCADE,
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建confirmation_logs表失败:', err);
    else console.log('✓ confirmation_logs表创建成功');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS archives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      confirmation_id INTEGER NOT NULL,
      archive_no TEXT UNIQUE NOT NULL,
      file_path TEXT,
      archived_by INTEGER NOT NULL,
      archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (confirmation_id) REFERENCES confirmations(id) ON DELETE CASCADE,
      FOREIGN KEY (archived_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建archives表失败:', err);
    else console.log('✓ archives表创建成功');
  });

  console.log('');
  console.log('开始插入初始数据...');

  const hashedPassword = bcrypt.hashSync('123456', 10);

  const users = [
    { username: 'audit_firm', name: '张会计师', role: 'audit_firm', organization: '诚信会计师事务所', phone: '13800138001', email: 'zhang@audit.com' },
    { username: 'bank_clerk', name: '李经办', role: 'bank_clerk', organization: '工商银行北京分行', phone: '13800138002', email: 'li@bank.com' },
    { username: 'review_manager', name: '王经理', role: 'review_manager', organization: '工商银行总行', phone: '13800138003', email: 'wang@bank.com' },
    { username: 'audit_client', name: '赵财务', role: 'audit_client', organization: '科技创新有限公司', phone: '13800138004', email: 'zhao@tech.com' }
  ];

  users.forEach(user => {
    db.run(
      'INSERT INTO users (username, password, name, role, organization, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.username, hashedPassword, user.name, user.role, user.organization, user.phone, user.email],
      (err) => {
        if (err) console.error(`插入用户${user.username}失败:`, err);
        else console.log(`✓ 用户 ${user.username} (${user.name}) 创建成功`);
      }
    );
  });

  db.run(
    'INSERT INTO audit_clients (name, credit_code, legal_representative, address, phone) VALUES (?, ?, ?, ?, ?)',
    ['科技创新有限公司', '91110000MA01ABCD12', '孙科技', '北京市海淀区中关村大街1号', '010-12345678'],
    (err) => {
      if (err) console.error('插入审计客户失败:', err);
      else console.log('✓ 审计客户 科技创新有限公司 创建成功');
    }
  );

  db.run(
    'INSERT INTO banks (name, branch, code, address, phone) VALUES (?, ?, ?, ?, ?)',
    ['中国工商银行', '北京海淀支行', 'ICBC110001', '北京市海淀区海淀大街8号', '010-87654321'],
    (err) => {
      if (err) console.error('插入银行失败:', err);
      else console.log('✓ 银行 中国工商银行北京海淀支行 创建成功');
    }
  );

  db.run(
    'INSERT INTO bank_accounts (client_id, bank_id, account_no, account_name, account_type, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [1, 1, '6222021234567890123', '科技创新有限公司', '基本存款账户', 'CNY', 'normal'],
    (err) => {
      if (err) console.error('插入银行账户失败:', err);
      else console.log('✓ 银行账户 6222021234567890123 创建成功');
    }
  );

  db.run(`
    CREATE INDEX idx_confirmations_status ON confirmations(status);
    CREATE INDEX idx_confirmations_firm ON confirmations(firm_id);
    CREATE INDEX idx_confirmations_client ON confirmations(client_id);
    CREATE INDEX idx_confirmations_bank ON confirmations(bank_id);
    CREATE INDEX idx_authorizations_confirmation ON authorizations(confirmation_id);
    CREATE INDEX idx_account_details_confirmation ON account_details(confirmation_id);
    CREATE INDEX idx_reply_opinions_confirmation ON reply_opinions(confirmation_id);
    CREATE INDEX idx_stamp_records_confirmation ON stamp_records(confirmation_id);
    CREATE INDEX idx_confirmation_logs_confirmation ON confirmation_logs(confirmation_id);
    CREATE INDEX idx_archives_confirmation ON archives(confirmation_id);
  `, (err) => {
    if (err) console.error('创建索引失败:', err);
    else console.log('✓ 索引创建成功');
  });
});

db.close((err) => {
  if (err) {
    console.error('关闭数据库失败:', err.message);
    process.exit(1);
  }
  console.log('');
  console.log('========================================');
  console.log('  数据库初始化完成！');
  console.log('========================================');
  console.log('');
  console.log('测试账号：');
  console.log('  会计师事务所: audit_firm / 123456');
  console.log('  银行经办:     bank_clerk / 123456');
  console.log('  复核经理:     review_manager / 123456');
  console.log('  审计客户:     audit_client / 123456');
  console.log('');
  process.exit(0);
});
