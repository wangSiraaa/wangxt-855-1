const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
let tokens = {};

async function login(username, password) {
  const res = await axios.post(`${BASE_URL}/api/auth/login`, { username, password });
  return res.data.data.token;
}

async function testSecondConfirmationFlow() {
  console.log('=== 二次确认完整流程测试 ===\n');

  try {
    console.log('1. 登录各角色...');
    tokens.auditFirm = await login('audit_firm', '123456');
    tokens.bankClerk = await login('bank_clerk', '123456');
    tokens.reviewManager = await login('review_manager', '123456');
    console.log('✓ 所有角色登录成功\n');

    console.log('2. 会计师事务所创建询证函...');
    const createRes = await axios.post(
      `${BASE_URL}/api/confirmations`,
      {
        confirmation_no: `TEST-${Date.now()}`,
        firm_id: 1,
        audit_client_id: 1,
        bank_id: 1,
        bank_account_id: 1,
        confirmation_type: 'balance',
        fiscal_year: '2024',
        audit_period: '2024-12-31',
        content: '测试银行存款余额询证函'
      },
      { headers: { Authorization: `Bearer ${tokens.auditFirm}` } }
    );
    const confirmationId = createRes.data.data.id;
    console.log(`✓ 询证函创建成功，ID: ${confirmationId}\n`);

    console.log('3. 直接将询证函状态更新为processing...');
    const db = require('../server/src/utils/db');
    await db.run(
      "UPDATE confirmations SET status = 'processing' WHERE id = ?",
      [confirmationId]
    );
    console.log('✓ 询证函状态已更新为processing\n');

    console.log('4. 银行经办完成处理...');
    const finishRes = await axios.post(
      `${BASE_URL}/api/confirmations/${confirmationId}/finish`,
      { remark: '账户明细录入完成' },
      { headers: { Authorization: `Bearer ${tokens.bankClerk}` } }
    );
    console.log(`✓ 处理完成，状态: ${finishRes.data.data.status}`);

    const detailRes1 = await axios.get(
      `${BASE_URL}/api/confirmations/${confirmationId}`,
      { headers: { Authorization: `Bearer ${tokens.bankClerk}` } }
    );
    const status1 = detailRes1.data.data.status;
    console.log(`✓ 询证函当前状态: ${status1}`);
    if (status1 !== 'second_confirm_pending') {
      throw new Error(`状态错误，期望second_confirm_pending，实际${status1}`);
    }

    console.log('\n6. 复核经理查看待办任务...');
    const todoRes = await axios.get(
      `${BASE_URL}/api/todo-tasks/my?status=pending`,
      { headers: { Authorization: `Bearer ${tokens.reviewManager}` } }
    );
    const pendingTasks = todoRes.data.data.filter(t => t.confirmation_id === confirmationId);
    console.log(`✓ 待办任务数量: ${pendingTasks.length}`);
    if (pendingTasks.length === 0) {
      throw new Error('未找到待办任务');
    }
    const todoTaskId = pendingTasks[0].id;
    console.log(`✓ 待办任务ID: ${todoTaskId}`);
    console.log(`✓ 任务类型: ${pendingTasks[0].task_type}`);
    console.log(`✓ 任务标题: ${pendingTasks[0].task_title}`);

    console.log('\n7. 复核经理处理二次确认（通过）...');
    const confirmRes = await axios.post(
      `${BASE_URL}/api/todo-tasks/${todoTaskId}/second-confirm`,
      { approved: true, remark: '二次确认通过，账户明细无误' },
      { headers: { Authorization: `Bearer ${tokens.reviewManager}` } }
    );
    console.log(`✓ 二次确认处理结果: ${confirmRes.data.message}`);

    const detailRes2 = await axios.get(
      `${BASE_URL}/api/confirmations/${confirmationId}`,
      { headers: { Authorization: `Bearer ${tokens.reviewManager}` } }
    );
    const status2 = detailRes2.data.data.status;
    console.log(`✓ 询证函当前状态: ${status2}`);
    if (status2 !== 'review_pending') {
      throw new Error(`状态错误，期望review_pending，实际${status2}`);
    }

    const taskRes = await axios.get(
      `${BASE_URL}/api/todo-tasks/my?status=completed`,
      { headers: { Authorization: `Bearer ${tokens.reviewManager}` } }
    );
    const completedTasks = taskRes.data.data.filter(t => t.id === todoTaskId);
    console.log(`✓ 待办任务状态: ${completedTasks[0]?.status}`);
    if (completedTasks[0]?.status !== 'completed') {
      throw new Error('待办任务状态未更新为completed');
    }

    console.log('\n✅ 二次确认完整流程测试通过！');
    console.log('✅ 待办处理后成功回写主单状态！');
    console.log('\n=== 测试总结 ===');
    console.log('1. 银行经办完成处理 → 状态变为second_confirm_pending');
    console.log('2. 自动创建二次确认待办任务');
    console.log('3. 复核经理处理二次确认（通过）');
    console.log('4. 待办任务状态变为completed');
    console.log('5. 主单状态自动回写为review_pending');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

testSecondConfirmationFlow();
