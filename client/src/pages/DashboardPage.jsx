import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Button, Table, Tag, message } from 'antd';
import { FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, SafetyOutlined, DatabaseOutlined, UserOutlined, ArrowRightOutlined, BankOutlined, AuditOutlined } from '@ant-design/icons';
import { useAuth, roleLabels } from '../contexts/AuthContext';
import { confirmationAPI, healthAPI } from '../services/api';
import { getStatusLabel, getStatusColor } from '../utils/constants';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);
  const [recentList, setRecentList] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listResponse, healthResponse] = await Promise.all([
        confirmationAPI.list({ page: 1, pageSize: 5 }),
        healthAPI.info()
      ]);
      
      if (listResponse.success) {
        const data = listResponse.data;
        setRecentList(data.list || []);
        
        const statusCounts = data.list?.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {});
        
        setStats({
          total: data.total || 0,
          draft: statusCounts.draft || 0,
          processing: statusCounts.processing || 0,
          pending: (statusCounts.authorization_pending || 0) + (statusCounts.review_pending || 0),
          completed: (statusCounts.stamped || 0) + (statusCounts.archived || 0)
        });
      }
      
      if (healthResponse.success) {
        setHealthInfo(healthResponse.data);
      }
    } catch (e) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: '函证总数', value: stats.total, icon: <FileTextOutlined />, color: '#1677ff' },
    { title: '草稿状态', value: stats.draft, icon: <ClockCircleOutlined />, color: '#6b7280' },
    { title: '处理中', value: stats.processing, icon: <BankOutlined />, color: '#e6a23c' },
    { title: '待审核', value: stats.pending, icon: <AuditOutlined />, color: '#f59e0b' },
    { title: '已完成', value: stats.completed, icon: <CheckCircleOutlined />, color: '#67c23a' }
  ];

  const columns = [
    {
      title: '函证编号',
      dataIndex: 'confirmation_code',
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>
    },
    {
      title: '客户',
      dataIndex: 'client_name'
    },
    {
      title: '银行',
      dataIndex: 'bank_name'
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/confirmations/${record.id}`)}>
          查看 <ArrowRightOutlined />
        </Button>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">系统总览</h1>
        <p className="page-description">
          欢迎回来，<span style={{ fontWeight: 500 }}>{user?.name}</span>
          <Tag className={`role-badge role-${user?.role}`} style={{ marginLeft: 8 }}>
            {roleLabels[user?.role]}
          </Tag>
        </p>
      </div>

      <Row gutter={[16, 16]}>
        {statCards.map((card, index) => (
          <Col xs={12} md={8} lg={4} key={index}>
            <Card className="card-shadow">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Statistic
                  title={card.title}
                  value={card.value}
                  valueStyle={{ color: card.color, fontSize: 24 }}
                />
                <div style={{ 
                  fontSize: 32, 
                  color: card.color,
                  opacity: 0.3
                }}>
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}

        <Col xs={24} md={12}>
          <Card title="最近函证" className="card-shadow">
            <Table
              columns={columns}
              dataSource={recentList}
              rowKey="id"
              size="small"
              loading={loading}
              pagination={false}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card 
            title="系统状态"
            className="card-shadow"
            extra={
              <Button type="link" onClick={() => navigate('/confirmations')}>
                查看全部
              </Button>
            }
          >
            {healthInfo && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <DatabaseOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                    <span style={{ fontWeight: 500 }}>数据库状态</span>
                    <Tag color={healthInfo.database?.connected ? 'success' : 'error'} style={{ marginLeft: 'auto' }}>
                      {healthInfo.database?.connected ? '连接正常' : '连接异常'}
                    </Tag>
                  </div>
                  {healthInfo.database && (
                    <div style={{ padding: '8px 12px', background: '#f5f7fa', borderRadius: 6, fontSize: 12 }}>
                      <div>版本: {healthInfo.database.version || 'SQLite 3.x</div>
                      <div>位置: {healthInfo.database.path || '本地数据库</div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <SafetyOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <span style={{ fontWeight: 500 }}>应用信息</span>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#f5f7fa', borderRadius: 6, fontSize: 12 }}>
                    <div>版本: {healthInfo.app?.version || '1.0.0'}</div>
                    <div>环境: {healthInfo.app?.environment || 'development'}</div>
                    <div>启动时间: {healthInfo.app?.startTime || dayjs().format('YYYY-MM-DD HH:mm:ss')}</div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <UserOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <span style={{ fontWeight: 500 }}>用户权限</span>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#f5f7fa', borderRadius: 6, fontSize: 12 }}>
                    <div>用户: {user?.name}</div>
                    <div>角色: {roleLabels[user?.role]}</div>
                    <div>登录时间: {dayjs().format('YYYY-MM-DD HH:mm')}</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
