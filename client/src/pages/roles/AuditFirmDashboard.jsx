import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, message, Tabs } from 'antd';
import { PlusOutlined, UploadOutlined, SendOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { confirmationAPI, authorizationAPI } from '../../services/api';
import ConfirmationTable from '../../components/ConfirmationTable';
import dayjs from 'dayjs';

export default function AuditFirmDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tabActive, setTabActive] = useState('pending');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [authorizationFormData, setAuthorizationFormData] = useState({
    authorization_number: '',
    authorization_date: dayjs().format('YYYY-MM-DD'),
    scope: 'full',
    authorized_by: '',
    remarks: ''
  });

  useEffect(() => {
    loadList();
  }, [tabActive]);

  const loadList = async () => {
    setLoading(true);
    try {
      const statusMap = {
        pending: 'draft,submitted,authorization_pending',
        processing: 'processing,processed,review_pending',
        completed: 'stamped,archived',
        rejected: 'authorization_rejected,review_rejected'
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

  const handleSubmit = async (record) => {
    Modal.confirm({
      title: '提交确认',
      content: `确定要提交函证 [${record.confirmation_code}]吗？\n\n注意：如果未上传授权书将无法提交。系统将自动检查授权书是否已上传。`,
      okText: '确认提交',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await confirmationAPI.submit(record.id);
          if (response.success) {
            message.success('提交成功');
            loadList();
          } else {
            if (response.error === 'NO_AUTHORIZATION') {
              Modal.error({
                title: '提交失败',
                content: (
                  <div>
                    <p style={{ color: '#dc2626', fontWeight: 500 }}>{response.message}</p>
                    <p style={{ marginTop: 12 }}>请先上传授权书后再提交。</p>
                  </div>
                ),
                okText: '去上传',
                onOk: () => {
                  setSelectedRecord(record);
                  setShowUploadModal(true);
                }
              });
            } else {
              message.error(response.message || '提交失败');
            }
          }
        } catch (e) {
          const errorData = e.response?.data;
          if (errorData?.error === 'NO_AUTHORIZATION') {
            Modal.error({
              title: '提交失败',
              content: (
                <div>
                  <p style={{ color: '#dc2626', fontWeight: 500 }}>{errorData.message || '授权书缺失，不得受理'}</p>
                  <p style={{ marginTop: 12 }}>请先上传授权书后再提交。</p>
                </div>
              ),
              okText: '去上传',
              onOk: () => {
                setSelectedRecord(record);
                setShowUploadModal(true);
              }
            });
          } else {
            message.error(e.response?.data?.message || '提交失败');
          }
        }
      }
    });
  };

  const handleUploadAuthorization = async () => {
    try {
      const authNumber = authorizationFormData.authorization_number || `AUTH-${Date.now()}`;
      const response = await authorizationAPI.create({
        confirmation_id: selectedRecord.id,
        authorization_number: authNumber,
        authorization_date: authorizationFormData.authorization_date,
        scope: authorizationFormData.scope,
        authorized_by: authorizationFormData.authorized_by || user?.name,
        remarks: authorizationFormData.remarks
      });
      
      if (response.success) {
        message.success('授权书上传成功');
        setShowUploadModal(false);
        loadList();
      } else {
        message.error(response.message || '上传失败');
      }
    } catch (e) {
      message.error('上传失败: ' + e.message);
    }
  };

  const tabItems = [
    { key: 'pending', label: `待处理 (${list.filter(i => ['draft', 'submitted', 'authorization_pending'].includes(i.status)).length})` },
    { key: 'processing', label: `处理中 (${list.filter(i => ['processing', 'processed', 'review_pending'].includes(i.status)).length})` },
    { key: 'completed', label: `已完成 (${list.filter(i => ['stamped', 'archived'].includes(i.status)).length})` },
    { key: 'rejected', label: `已驳回 (${list.filter(i => ['authorization_rejected', 'review_rejected'].includes(i.status)).length})` },
    { key: 'all', label: '全部' }
  ];

  const quickActions = [
    {
      title: '新建询证函',
      icon: <PlusOutlined />,
      action: () => navigate('/confirmations/create'),
      color: '#1677ff',
      description: '创建新的银行询证函'
    },
    {
      title: '上传授权书',
      icon: <UploadOutlined />,
      action: () => message.info('请先选择需要上传授权书的函证'),
      color: '#52c41a',
      description: '为已创建的函证上传授权书'
    },
    {
      title: '批量提交',
      icon: <SendOutlined />,
      action: () => message.info('请在列表中选择草稿状态的函证进行提交'),
      color: '#722ed1',
      description: '选择函证并提交'
    },
    {
      title: '下载归档',
      icon: <DownOutlined />,
      action: () => setTabActive('completed'),
      color: '#fa8c16',
      description: '下载已完成的函证档案'
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">会计师事务所工作台</h1>
        <p className="page-description">
          管理您创建的所有银行询证函，包括创建、提交、查看处理进度
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
          tabBarExtraContent={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/confirmations/create')}
            >
              新建询证函
            </Button>
          }
        />
        <ConfirmationTable data={list} loading={loading} />
      </Card>

      <Modal
        title="上传授权书"
        open={showUploadModal}
        onOk={handleUploadAuthorization}
        onCancel={() => setShowUploadModal(false)}
        okText="确认上传"
        width={600}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>函证信息</div>
              <div style={{ padding: 12, background: '#f5f7fa', borderRadius: 6 }}>
                <div>函证编号: {selectedRecord.confirmation_code}</div>
                <div>客户: {selectedRecord.client_name}</div>
                <div>银行: {selectedRecord.bank_name}</div>
                <div>账户: {selectedRecord.account_no}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>授权书信息</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>授权书编号</label>
                  <input
                    type="text"
                    className="ant-input"
                    placeholder="请输入授权书编号"
                    value={authorizationFormData.authorization_number}
                    onChange={(e) => setAuthorizationFormData({
                      ...authorizationFormData,
                      authorization_number: e.target.value
                    })}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>授权日期</label>
                  <input
                    type="date"
                    className="ant-input"
                    value={authorizationFormData.authorization_date}
                    onChange={(e) => setAuthorizationFormData({
                      ...authorizationFormData,
                      authorization_date: e.target.value
                    })}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>授权范围</label>
                  <select
                    className="ant-select"
                    value={authorizationFormData.scope}
                    onChange={(e) => setAuthorizationFormData({
                      ...authorizationFormData,
                      scope: e.target.value
                    })}
                    style={{ width: '100%', marginTop: 4, height: 32, padding: '0 11px' }}
                  >
                    <option value="full">全部授权</option>
                    <option value="balance">仅余额</option>
                    <option value="transaction">仅交易</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>授权人</label>
                  <input
                    type="text"
                    className="ant-input"
                    placeholder="请输入授权人姓名"
                    value={authorizationFormData.authorized_by}
                    onChange={(e) => setAuthorizationFormData({
                      ...authorizationFormData,
                      authorized_by: e.target.value
                    })}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>备注</label>
                  <textarea
                    className="ant-input"
                    placeholder="请输入备注信息"
                    value={authorizationFormData.remarks}
                    onChange={(e) => setAuthorizationFormData({
                      ...authorizationFormData,
                      remarks: e.target.value
                    })}
                    style={{ width: '100%', marginTop: 4, minHeight: 60 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
