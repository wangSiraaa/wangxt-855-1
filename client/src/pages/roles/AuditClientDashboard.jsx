import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, message, Tabs, Tag } from 'antd';
import { UserOutlined, CheckCircleOutlined, ClockCircleOutlined, FileProtectOutlined } from '@ant-design/icons';
import { confirmationAPI, authorizationAPI } from '../../services/api';
import ConfirmationTable from '../../components/ConfirmationTable';
import { getStatusLabel, getStatusColor } from '../../utils/constants';
import dayjs from 'dayjs';

export default function AuditClientDashboard() {
  const [tabActive, setTabActive] = useState('pending');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    loadList();
  }, [tabActive]);

  const loadList = async () => {
    setLoading(true);
    try {
      const statusMap = {
        pending: 'authorization_pending',
        authorized: 'processing,processed,review_pending,stamped',
        archived: 'archived',
        all: ''
      };
      
      const params = {};
      if (tabActive !== 'all') {
        params.status = statusMap[tabActive];
      }
      
      const response = await confirmationAPI.list(params);
      if (response.success) {
        setList(response.data.list || []);
      }
    } catch (e) {
      message.error('加载列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (record) => {
    Modal.confirm({
      title: '确认授权',
      content: `确定要为函证 [${record.confirmation_code}] 授权吗？\n\n授权后，银行将可以查询并回复您的账户信息。`,
      okText: '确认授权',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await authorizationAPI.create({
            confirmation_id: record.id,
            authorization_number: `AUTH-${Date.now()}`,
            authorization_date: dayjs().format('YYYY-MM-DD'),
            scope: 'full',
            authorized_by: '审计客户',
            authorization_status: 'approved',
            remarks: '客户已确认授权'
          });
          
          if (response.success) {
            message.success('授权成功');
            loadList();
          } else {
            message.error(response.message || '授权失败');
          }
        } catch (e) {
          message.error('授权失败: ' + e.message);
        }
      }
    });
  };

  const handleRejectAuthorization = (record) => {
    Modal.confirm({
      title: '拒绝授权',
      content: `确定要拒绝为函证 [${record.confirmation_code}] 授权吗？\n\n拒绝后，该函证将被退回会计师事务所。`,
      okText: '确认拒绝',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          message.info('此功能需要后端支持。当前演示中，授权书缺失的函证会直接被系统拒绝。');
        } catch (e) {
          message.error('操作失败: ' + e.message);
        }
      }
    });
  };

  const tabItems = [
    { key: 'pending', label: `待授权 (${list.filter(i => i.status === 'authorization_pending').length})` },
    { key: 'authorized', label: `已授权 (${list.filter(i => ['processing', 'processed', 'review_pending', 'stamped'].includes(i.status)).length})` },
    { key: 'archived', label: `已归档 (${list.filter(i => i.status === 'archived').length})` },
    { key: 'all', label: '全部' }
  ];

  const quickActions = [
    {
      title: '待授权函证',
      icon: <ClockCircleOutlined />,
      count: list.filter(i => i.status === 'authorization_pending').length,
      action: () => setTabActive('pending'),
      color: '#e6a23c',
      description: '需要您确认授权的函证'
    },
    {
      title: '已授权函证',
      icon: <CheckCircleOutlined />,
      count: list.filter(i => ['processing', 'processed', 'review_pending', 'stamped'].includes(i.status)).length,
      action: () => setTabActive('authorized'),
      color: '#409eff',
      description: '正在处理的函证'
    },
    {
      title: '已完成',
      icon: <FileProtectOutlined />,
      count: list.filter(i => i.status === 'archived').length,
      action: () => setTabActive('archived'),
      color: '#67c23a',
      description: '已归档的函证'
    },
    {
      title: '全部函证',
      icon: <UserOutlined />,
      count: list.length,
      action: () => setTabActive('all'),
      color: '#1677ff',
      description: '查看所有与您相关的函证'
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">审计客户工作台</h1>
        <p className="page-description">
          确认和授权会计师事务所发来的银行询证函，查看处理进度
        </p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {quickActions.map((action, index) => (
          <Col xs={12} md={6} key={index}>
            <Card
              hoverable
              className="card-shadow"
              onClick={action.action}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  fontSize: 32,
                  color: action.color,
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${action.color}15`,
                  borderRadius: 8
                }}>
                  {action.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 16 }}>{action.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{action.description}</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: action.color, marginTop: 4 }}>
                    {action.count}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="card-shadow">
        <Tabs
          activeKey={tabActive}
          onChange={setTabActive}
          items={tabItems}
        />
        <div style={{ marginBottom: 16 }}>
          <Tag color="warning">重要提示</Tag>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            请仔细核对函证信息，确认无误后再进行授权。授权后银行将可以查询您的账户信息。
          </span>
        </div>
        <ConfirmationTable
          data={list}
          loading={loading}
        />
      </Card>

      <Modal
        title="授权书详情"
        open={showAuthModal}
        onOk={() => handleAuthorize(selectedRecord)}
        onCancel={() => setShowAuthModal(false)}
        okText="确认授权"
        width={600}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>询证函信息</div>
              <div style={{ padding: 12, background: '#f5f7fa', borderRadius: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>函证编号: <span style={{ fontFamily: 'monospace' }}>{selectedRecord.confirmation_code}</span></div>
                  <div>事务所: {selectedRecord.audit_firm_name || '测试会计师事务所'}</div>
                  <div>银行: {selectedRecord.bank_name}</div>
                  <div>账户: <span style={{ fontFamily: 'monospace' }}>{selectedRecord.account_no}</span></div>
                  <div>币种: {selectedRecord.currency}</div>
                  <div>询证金额: ¥{selectedRecord.requested_balance?.toLocaleString()}</div>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 500, color: '#d46b08', marginBottom: 4 }}>授权声明</div>
              <div style={{ color: '#874d00' }}>
                本人/本公司确认已了解该询证函的内容，同意授权银行向会计师事务所提供相关账户信息。
                <br />本人/本公司确认所提供的信息真实、完整、准确。
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
