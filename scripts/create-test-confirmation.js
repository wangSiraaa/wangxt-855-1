const http = require('http');

const API_BASE = 'localhost';
const API_PORT = 3001;

function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createTestConfirmation() {
  console.log('=== 创建测试用缺授权书询证函 ===\n');
  
  try {
    // 1. 登录
    console.log('1. 登录系统...');
    const loginResponse = await httpRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'audit_firm', password: '123456' });
    
    const token = loginResponse.data.data.token;
    const userInfo = loginResponse.data.data.user;
    const authHeader = `Bearer ${token}`;
    console.log('   ✅ 登录成功，获取 Token');
    
    // 2. 获取审计客户列表
    console.log('\n2. 获取审计客户列表...');
    const clientsResponse = await httpRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: '/api/master/clients',
      method: 'GET',
      headers: { 'Authorization': authHeader }
    });
    const clients = clientsResponse.data.data;
    const clientId = clients[0].id;
    console.log(`   ✅ 选择客户 ID: ${clientId}, 名称: ${clients[0].client_name || clients[0].name}`);
    
    // 3. 获取银行列表
    console.log('\n3. 获取银行列表...');
    const banksResponse = await httpRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: '/api/master/banks',
      method: 'GET',
      headers: { 'Authorization': authHeader }
    });
    const banks = banksResponse.data.data;
    const bankId = banks[0].id;
    console.log(`   ✅ 选择银行 ID: ${bankId}, 名称: ${banks[0].bank_name || banks[0].name}`);
    
    // 4. 获取银行账户列表
    console.log('\n4. 获取银行账户列表...');
    const accountsResponse = await httpRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/master/accounts?client_id=${clientId}`,
      method: 'GET',
      headers: { 'Authorization': authHeader }
    });
    const accounts = accountsResponse.data.data;
    const accountId = accounts[0].id;
    console.log(`   ✅ 选择账户 ID: ${accountId}, 账号: ${accounts[0].account_no}`);
    
    // 5. 创建缺授权书的询证函草稿
    console.log('\n5. 创建缺授权书询证函...');
    const createResponse = await httpRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: '/api/confirmations',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': authHeader 
      }
    }, {
      firm_id: userInfo.id,
      client_id: clientId,
      bank_id: bankId,
      account_id: accountId,
      audit_period: '2024年度',
      confirmation_type: 'balance',
      content: '请确认该账户截至2024年12月31日的余额是否正确。',
      has_authorization: false,
      remarks: '【测试】缺授权书提交验证 - 真实页面测试'
    });
    
    if (createResponse.statusCode !== 201) {
      console.error('   ❌ 创建失败:', createResponse.data);
      process.exit(1);
    }
    
    const confirmationId = createResponse.data.data.id;
    const confirmationNo = createResponse.data.data.confirmation_no;
    const hasAuth = createResponse.data.data.has_authorization;
    
    console.log(`   ✅ 询证函创建成功`);
    console.log(`      ID: ${confirmationId}`);
    console.log(`      编号: ${confirmationNo}`);
    console.log(`      授权书状态: ${hasAuth ? '已上传' : '未上传'}`);
    
    console.log('\n=== 任务完成 ===');
    console.log(`\n请在浏览器中访问: http://localhost:5173/confirmations/${confirmationId}`);
    console.log('然后点击"提交"按钮测试缺授权书拦截功能\n');
    
    return { confirmationId, confirmationNo };
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

createTestConfirmation();
