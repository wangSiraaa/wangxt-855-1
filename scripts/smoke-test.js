const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3001;
const BASE_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
const API_BASE = `${BASE_URL}/api`;

let serverProcess = null;
let testResults = [];
let testPassed = true;

function logStep(step, message) {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.log(`[\x1b[36m${timestamp}\x1b[0m] [\x1b[33m步骤 ${step}\x1b[0m] ${message}`);
}

function logResult(passed, message) {
  const status = passed ? '\x1b[32m✓ 通过\x1b[0m' : '\x1b[31m✗ 失败\x1b[0m';
  console.log(`       ${status} - ${message}`);
  testResults.push({ passed, message });
  if (!passed) testPassed = false;
}

function logError(message) {
  console.log(`       \x1b[31m✗ 错误: ${message}\x1b[0m`);
}

function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          };
          resolve(response);
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, rawData: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServerReady(timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const response = await httpRequest({
        hostname: SERVER_HOST,
        port: SERVER_PORT,
        path: '/api/health',
        method: 'GET'
      });
      if (response.statusCode === 200 && response.data && response.data.success) {
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }
    await sleep(1000);
  }
  return false;
}

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('');
    logStep('1', '初始化数据库...');
    
    try {
      execSync('npm run init:db', { 
        cwd: path.join(__dirname, '..'), 
        stdio: 'pipe',
        timeout: 30000
      });
      logResult(true, '数据库初始化完成');
    } catch (e) {
      logResult(false, `数据库初始化失败: ${e.message}`);
      reject(e);
      return;
    }

    logStep('2', '启动后端服务...');
    
    serverProcess = spawn('npm', ['run', 'dev:server'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: SERVER_PORT },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverOutput = '';
    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });
    serverProcess.stderr.on('data', (data) => {
      serverOutput += data.toString();
    });

    waitForServerReady(30000).then((ready) => {
      if (ready) {
        logResult(true, `后端服务已启动，监听端口 ${SERVER_PORT}`);
        resolve();
      } else {
        logResult(false, `后端服务启动超时，输出: ${serverOutput.substring(0, 500)}`);
        reject(new Error('Server startup timeout'));
      }
    });
  });
}

function stopServer() {
  if (serverProcess) {
    logStep('9', '停止后端服务...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    logResult(true, '后端服务已停止');
  }
}

async function runSmokeTest() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           银行函证回函协同系统 - Smoke 测试套件                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('测试场景: 提交缺授权书函证并验证前后端均提示不可受理');
  console.log('');

  try {
    await startServer();

    logStep('3', '执行健康检查，验证数据库连接...');
    const healthResponse = await httpRequest({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/api/health',
      method: 'GET'
    });
    
    if (healthResponse.statusCode === 200 && healthResponse.data && healthResponse.data.success) {
      logResult(true, '健康检查通过，数据库连接正常');
      const dbStatus = healthResponse.data.data && healthResponse.data.data.services && healthResponse.data.data.services.database && healthResponse.data.data.services.database.status;
      logResult(dbStatus === 'up', 
                `数据库状态: ${dbStatus || '未知'}`);
    } else {
      logResult(false, `健康检查失败，状态码: ${healthResponse.statusCode}`);
    }

    logStep('4', '以会计师事务所身份登录...');
    const loginResponse = await httpRequest({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'audit_firm',
      password: '123456'
    });

    let authToken = null;
    if (loginResponse.statusCode === 200 && loginResponse.data && loginResponse.data.success) {
      authToken = loginResponse.data.data.token;
      logResult(true, '登录成功，获取到 JWT Token');
      logResult(loginResponse.data.data.user.role === 'audit_firm', 
                `用户角色: ${loginResponse.data.data.user.role}`);
    } else {
      logResult(false, `登录失败，状态码: ${loginResponse.statusCode}, 消息: ${loginResponse.data ? loginResponse.data.message : '未知'}`);
      throw new Error('Login failed');
    }

    logStep('5', '创建不带授权书的询证函草稿...');
    const createResponse = await httpRequest({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/api/confirmations',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, {
      firm_id: 1,
      client_id: 1,
      bank_id: 1,
      account_id: 1,
      audit_period: '2024年度',
      confirmation_type: 'balance',
      content: '请确认该账户截至2024年12月31日的余额是否正确。',
      has_authorization: false,
      remarks: 'Smoke测试 - 缺授权书'
    });

    let confirmationId = null;
    if (createResponse.statusCode === 201 && createResponse.data && createResponse.data.success) {
      confirmationId = createResponse.data.data.id;
      logResult(true, `询证函创建成功，ID: ${confirmationId}`);
      logResult(createResponse.data.data.status === 'draft', 
                `函证状态: ${createResponse.data.data.status}`);
      const hasAuth = createResponse.data.data.has_authorization;
      const hasAuthBool = hasAuth === true || hasAuth === 1;
      logResult(!hasAuthBool, 
                `授权书状态: ${hasAuthBool ? '已上传' : '未上传'}`);
    } else {
      logResult(false, `创建询证函失败，状态码: ${createResponse.statusCode}`);
      throw new Error('Create confirmation failed');
    }

    logStep('6', '尝试提交缺授权书的询证函...');
    const submitResponse = await httpRequest({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: `/api/confirmations/${confirmationId}/submit`,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    logStep('7', '验证后端返回授权书缺失错误...');
    
    const backendChecks = [
      {
        name: 'HTTP 状态码为 400',
        check: submitResponse.statusCode === 400,
        actual: submitResponse.statusCode
      },
      {
        name: 'success 字段为 false',
        check: submitResponse.data && submitResponse.data.success === false,
        actual: submitResponse.data ? submitResponse.data.success : 'N/A'
      },
      {
        name: '错误码为 NO_AUTHORIZATION',
        check: submitResponse.data && submitResponse.data.error === 'NO_AUTHORIZATION',
        actual: submitResponse.data ? submitResponse.data.error : 'N/A'
      },
      {
        name: '错误消息包含"授权书缺失，不得受理"',
        check: submitResponse.data && submitResponse.data.message && 
               submitResponse.data.message.includes('授权书缺失，不得受理'),
        actual: submitResponse.data ? submitResponse.data.message : 'N/A'
      }
    ];

    for (const check of backendChecks) {
      logResult(check.check, `${check.name} (实际值: ${check.actual})`);
    }

    logStep('8', '验证前端错误处理逻辑...');
    
    const frontendFiles = [
      'client/src/pages/roles/AuditFirmDashboard.jsx',
      'client/src/pages/ConfirmationDetailPage.jsx',
      'client/src/pages/ConfirmationCreatePage.jsx'
    ];

    let frontendValidationPassed = true;
    for (const filePath of frontendFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const hasErrorHandling = content.includes('NO_AUTHORIZATION') && 
                                  content.includes('授权书缺失，不得受理');
        const fileName = path.basename(filePath);
        logResult(hasErrorHandling, `${fileName} 包含授权书缺失错误处理逻辑`);
        if (!hasErrorHandling) frontendValidationPassed = false;
      }
    }

    if (frontendValidationPassed) {
      logResult(true, '前端所有相关页面均已实现授权书缺失错误提示逻辑');
    }

    stopServer();

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                        测试结果汇总                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('');

    const passedCount = testResults.filter(r => r.passed).length;
    const totalCount = testResults.length;
    
    console.log(`总计: ${totalCount} 项检查，通过: ${passedCount} 项，失败: ${totalCount - passedCount} 项`);
    console.log('');

    if (testPassed) {
      console.log('\x1b[32m╔══════════════════════════════════════════════════════════════════╗\x1b[0m');
      console.log('\x1b[32m║                    ✓ Smoke 测试全部通过！                         ║\x1b[0m');
      console.log('\x1b[32m╚══════════════════════════════════════════════════════════════════╝\x1b[0m');
      console.log('');
      console.log('验证结论:');
      console.log('  ✓ 后端API正确拦截了缺授权书的提交请求，返回 NO_AUTHORIZATION 错误码');
      console.log('  ✓ 错误消息明确包含"授权书缺失，不得受理"业务提示');
      console.log('  ✓ 前端相关页面均实现了对应错误的处理逻辑，会向用户显示友好提示');
      console.log('  ✓ 健康检查正常，数据库连接良好');
      console.log('  ✓ 完整业务流程符合"授权书缺失不得受理"的业务规则');
      console.log('');
      process.exit(0);
    } else {
      console.log('\x1b[31m╔══════════════════════════════════════════════════════════════════╗\x1b[0m');
      console.log('\x1b[31m║                    ✗ Smoke 测试存在失败项                         ║\x1b[0m');
      console.log('\x1b[31m╚══════════════════════════════════════════════════════════════════╝\x1b[0m');
      console.log('');
      console.log('失败项详情:');
      testResults.filter(r => !r.passed).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.message}`);
      });
      console.log('');
      process.exit(1);
    }

  } catch (error) {
    logError(`测试执行异常: ${error.message}`);
    console.log(error.stack);
    stopServer();
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('');
  console.log('收到中断信号，正在清理...');
  stopServer();
  process.exit(0);
});

runSmokeTest();
