import React, { useState } from 'react';
import { Form, Input, Button, message, Card, Select, Alert } from 'antd';
import { UserOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth, roleLabels, roleColors } from '../contexts/AuthContext';
import { healthAPI } from '../services/api';

const { Option } = Select;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const roleDemoAccounts = [
    { role: 'audit_firm', username: 'audit_firm', password: '123456', desc: '会计师事务所' },
    { role: 'bank_clerk', username: 'bank_clerk', password: '123456', desc: '银行经办' },
    { role: 'review_manager', username: 'review_manager', password: '123456', desc: '复核经理' },
    { role: 'audit_client', username: 'audit_client', password: '123456', desc: '审计客户' }
  ];

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await healthAPI.check();
      setHealthStatus(response);
      if (response.healthy) {
        message.success('数据库连接正常，系统健康');
      } else {
        message.error('数据库连接异常');
      }
    } catch (e) {
      setHealthStatus({ healthy: false, error: e.message });
      message.error('健康检查失败: ' + e.message);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    const account = roleDemoAccounts.find(a => a.role === role);
    if (account) {
      setSelectedRole(role);
      form.setFieldsValue({
        username: account.username,
        password: account.password
      });
    }
  };

  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await login(values.username, values.password);
      message.success('登录成功！');
      
      const roleRedirects = {
        audit_firm: '/audit-firm',
        bank_clerk: '/bank-clerk',
        review_manager: '/review-manager',
        audit_client: '/audit-client'
      };
      
      const redirectPath = roleRedirects[response.data.user.role] || '/dashboard';
      navigate(redirectPath);
    } catch (e) {
      message.error(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div className="login-logo">
          <BankOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
          <h1 className="login-title">银行函证回函协同系统</h1>
          <p className="login-subtitle">Bank Confirmation Collaboration Platform</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#6b7280' }}>
            快速选择身份：
          </div>
          <Select
            placeholder="选择角色快速填入账号"
            style={{ width: '100%', marginBottom: 16 }}
            onChange={handleRoleSelect}
            value={selectedRole}
            allowClear
          >
            {roleDemoAccounts.map(account => (
              <Option key={account.role} value={account.role}>
                <span style={{ 
                  display: 'inline-block', 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  backgroundColor: roleColors[account.role],
                  marginRight: 8
                }}></span>
                {account.desc} ({account.username})
              </Option>
            ))}
          </Select>
        </div>

        {healthStatus && (
          <Alert
            message={healthStatus.healthy ? '系统健康' : '系统异常'}
            description={healthStatus.healthy ? 
              `数据库版本: ${healthStatus.database?.version || '未知'}` : 
              (healthStatus.error || '未知错误')
            }
            type={healthStatus.healthy ? 'success' : 'error'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{ width: '100%', height: 42, fontSize: 16, fontWeight: 500 }}
            >
              登录系统
            </Button>
          </Form.Item>

          <Button 
            type="default"
            onClick={checkHealth}
            loading={healthLoading}
            style={{ width: '100%', marginBottom: 16 }}
          >
            {healthLoading ? '检查中...' : '检查系统健康状态'}
          </Button>
        </Form>

        <div style={{ 
          marginTop: 20, 
          padding: 12, 
          background: '#f9fafb', 
          borderRadius: 8,
          fontSize: 12
        }}>
          <div style={{ fontWeight: 500, color: '#374151', marginBottom: 8 }}>
            测试账号：
          </div>
          {roleDemoAccounts.map(account => (
            <div key={account.role} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '4px 0',
              color: '#6b7280'
            }}>
              <span>
                <span style={{ 
                  display: 'inline-block', 
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  backgroundColor: roleColors[account.role],
                  marginRight: 6
                }}></span>
                {roleLabels[account.role]}:
              </span>
              <span style={{ fontFamily: 'monospace' }}>{account.username} / {account.password}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
          <div>© 2024 银行函证回函协同系统 v1.0.0</div>
          <div style={{ marginTop: 4 }}>
            请使用测试账号登录体验完整流程
          </div>
        </div>
      </Card>
    </div>
  );
}
