import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FileTextOutlined,
  DashboardOutlined,
  AuditOutlined,
  BankOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FileProtectOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { useAuth, roleLabels } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const roleMenuItems = {
    audit_firm: [
      {
        key: '/audit-firm',
        icon: <AuditOutlined />,
        label: '工作台',
        onClick: () => navigate('/audit-firm')
      },
      {
        key: '/confirmations/create',
        icon: <FileTextOutlined />,
        label: '新建询证函',
        onClick: () => navigate('/confirmations/create')
      },
      {
        key: '/confirmations',
        icon: <EyeOutlined />,
        label: '询证函列表',
        onClick: () => navigate('/confirmations')
      }
    ],
    bank_clerk: [
      {
        key: '/bank-clerk',
        icon: <BankOutlined />,
        label: '工作台',
        onClick: () => navigate('/bank-clerk')
      },
      {
        key: '/confirmations',
        icon: <EyeOutlined />,
        label: '待处理函证',
        onClick: () => navigate('/confirmations?status=processing')
      }
    ],
    review_manager: [
      {
        key: '/review-manager',
        icon: <CheckCircleOutlined />,
        label: '工作台',
        onClick: () => navigate('/review-manager')
      },
      {
        key: '/confirmations',
        icon: <EyeOutlined />,
        label: '待复核函证',
        onClick: () => navigate('/confirmations?status=review_pending')
      }
    ],
    audit_client: [
      {
        key: '/audit-client',
        icon: <UserOutlined />,
        label: '工作台',
        onClick: () => navigate('/audit-client')
      },
      {
        key: '/confirmations',
        icon: <EyeOutlined />,
        label: '我的函证',
        onClick: () => navigate('/confirmations')
      }
    ]
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '总览',
      onClick: () => navigate('/dashboard')
    },
    ...(roleMenuItems[user?.role] || []),
    {
      type: 'divider'
    },
    {
      key: '/health-info',
      icon: <SafetyOutlined />,
      label: '系统健康',
      onClick: () => navigate('/dashboard')
    }
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: async () => {
        await logout();
        navigate('/login');
      }
    }
  ];

  const selectedKeys = location.pathname.startsWith('/confirmations/') && location.pathname !== '/confirmations'
    ? ['/confirmations']
    : [location.pathname];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#001529'
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingLeft: collapsed ? 0 : 20,
          color: 'white',
          fontSize: collapsed ? 20 : 18,
          fontWeight: 600,
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <FileProtectOutlined style={{ marginRight: collapsed ? 0 : 8 }} />
          {!collapsed && '银行函证协同'}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          style={{ borderRight: 0, marginTop: 16 }}
        />
      </Sider>
      
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          background: 'white',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 64
        }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#1f2937' }}>
              银行函证回函协同系统
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user && (
              <>
                <span className={`role-badge role-${user.role}`}>
                  {roleLabels[user.role]}
                </span>
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    gap: 8
                  }}>
                    <Avatar 
                      size="small" 
                      style={{ backgroundColor: '#1677ff' }}
                      icon={<UserOutlined />}
                    />
                    <span style={{ color: '#1f2937' }}>{user.name}</span>
                  </div>
                </Dropdown>
                <Button 
                  size="small" 
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                >
                  退出
                </Button>
              </>
            )}
          </div>
        </Header>
        
        <Content style={{
          margin: '16px',
          minHeight: 'calc(100vh - 96px)',
          background: '#f5f7fa'
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
