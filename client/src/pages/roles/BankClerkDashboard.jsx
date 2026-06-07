import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, message, Tabs, Tag } from 'antd';
import { BankOutlined, FileSearchOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { confirmationAPI, accountDetailAPI, replyOpinionAPI } from '../../services/api';
import ConfirmationTable from '../../components/ConfirmationTable';
import { getStatusLabel, getStatusColor } from '../../utils/constants';
import dayjs from 'dayjs';

export default function BankClerkDashboard() {
  const navigate = useNavigate();
  const [tabActive, setTabActive] = useState('pending');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processFormData, setProcessFormData] = useState({
    balance: '',
    currency: 'CNY',
    account_type: 'savings',
    account_status: 'normal',
    interest_rate: '',
    overdraft_limit: '',
    remarks: ''
  });

  useEffect(() => {
    loadList();
  }, [tabActive]);

  const loadList = async () => {
    setLoading(true);
    try {
      const statusMap = {
        pending: 'processing',
        processed: 'processed,review_pending,review_rejected',
        completed: 'stamped,archived',
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

  const handleStartProcess = (record) => {
    setSelectedRecord(record);
    setProcessFormData({
      ...processFormData,
      currency: record.currency || 'CNY'
    });
    setShowProcessModal(true);
  };

  const handleProcess = async () => {
    try {
      const accountResponse = await accountDetailAPI.create({
        confirmation_id: selectedRecord.id,
        balance: parseFloat(processFormData.balance),
        currency: processFormData.currency,
        account_type: processFormData.account_type,
        account_status: processFormData.account_status,
        interest_rate: parseFloat(processFormData.interest_rate) || null,
        overdraft_limit: parseFloat(processFormData.overdraft_limit) || null,
        as_of_date: dayjs().format('YYYY-MM-DD'),
        remarks: processFormData.remarks
      });

      if (!accountResponse.success) {
        throw new Error(accountResponse.message || '录入账户明细失败');
      }

      const opinionResponse = await replyOpinionAPI.create({
        confirmation_id: selectedRecord.id,
        opinion_type: 'consistent',
        opinion_content: '账户信息一致，余额相符',
        confirmed_by: 'bank_clerk',
        confirmed_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        remarks: ''
      });

      if (!opinionResponse.success) {
        throw new Error(opinionResponse.message || '录入回函意见失败');
      }

      const finishResponse = await confirmationAPI.finish(selectedRecord.id);
      
      if (finishResponse.success) {
        message.success('处理完成，已提交复核');
        setShowProcessModal(false);
        loadList();
      } else {
        throw new Error(finishResponse.message || '提交复核失败');
      }
    } catch (e) {
      message.error('处理失败: ' + e.message);
    }
  };

  const tabItems = [
    { key: 'pending', label: `待处理 (${list.filter(i => i.status === 'processing').length})` },
    { key: 'processed', label: `已处理 (${list.filter(i => ['processed', 'review_pending', 'review_rejected'].includes(i.status)).length})` },
    { key: 'completed', label: `已完成 (${list.filter(i => ['stamped', 'archived'].includes(i.status)).length})` },
    { key: 'all', label: '全部' }
  ];

  const quickActions = [
    {
      title: '待处理函证',
      icon: <ClockCircleOutlined />,
      count: list.filter(i => i.status === 'processing').length,
      action: () => setTabActive('pending'),
      color: '#e6a23c',
      description: '需要处理的函证'
    },
    {
      title: '已处理函证',
      icon: <FileSearchOutlined />,
      count: list.filter(i => ['processed', 'review_pending'].includes(i.status)).length,
      action: () => setTabActive('processed'),
      color: '#409eff',
      description: '等待复核的函证'
    },
    {
      title: '已完成',
      icon: <CheckCircleOutlined />,
      count: list.filter(i => ['stamped', 'archived'].includes(i.status)).length,
      action: () => setTabActive('completed'),
      color: '#67c23a',
      description: '已盖章归档的函证'
    },
    {
      title: '全部函证',
      icon: <BankOutlined />,
      count: list.length,
      action: () => setTabActive('all'),
      color: '#1677ff',
      description: '查看所有函证'
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">银行经办工作台</h1>
        <p className="page-description">
          处理会计师事务所发来的询证函，录入账户明细和回函意见
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
          <Tag color="warning">提示</Tag>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            点击"查看"进入详情页，或点击"处理"开始录入账户信息
          </span>
        </div>
        <ConfirmationTable
          data={list}
          loading={loading}
        />
      </Card>

      <Modal
        title="处理询证函 - 录入账户明细"
        open={showProcessModal}
        onOk={handleProcess}
        onCancel={() => setShowProcessModal(false)}
        okText="提交处理"
        width={700}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f7fa', borderRadius: 6 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>函证信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div>函证编号: <span style={{ fontFamily: 'monospace' }}>{selectedRecord.confirmation_code}</span></div>
                <div>客户: {selectedRecord.client_name}</div>
                <div>银行: {selectedRecord.bank_name}</div>
                <div>账户: <span style={{ fontFamily: 'monospace' }}>{selectedRecord.account_no}</span></div>
                <div>币种: {selectedRecord.currency}</div>
                <div>询证金额: ¥{selectedRecord.requested_balance?.toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>账户余额 *</label>
                <input
                  type="number"
                  className="ant-input"
                  placeholder="请输入账户实际余额"
                  value={processFormData.balance}
                  onChange={(e) => setProcessFormData({ ...processFormData, balance: e.target.value })}
                  style={{ width: '100%', marginTop: 4 }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>币种</label>
                <select
                  className="ant-select"
                  value={processFormData.currency}
                  onChange={(e) => setProcessFormData({ ...processFormData, currency: e.target.value })}
                  style={{ width: '100%', marginTop: 4, height: 32, padding: '0 11px' }}
                >
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="USD">美元 (USD)</option>
                  <option value="EUR">欧元 (EUR)</option>
                  <option value="GBP">英镑 (GBP)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>账户类型</label>
                <select
                  className="ant-select"
                  value={processFormData.account_type}
                  onChange={(e) => setProcessFormData({ ...processFormData, account_type: e.target.value })}
                  style={{ width: '100%', marginTop: 4, height: 32, padding: '0 11px' }}
                >
                  <option value="savings">储蓄账户</option>
                  <option value="current">活期账户</option>
                  <option value="fixed">定期账户</option>
                  <option value="loan">贷款账户</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>账户状态</label>
                <select
                  className="ant-select"
                  value={processFormData.account_status}
                  onChange={(e) => setProcessFormData({ ...processFormData, account_status: e.target.value })}
                  style={{ width: '100%', marginTop: 4, height: 32, padding: '0 11px' }}
                >
                  <option value="normal">正常</option>
                  <option value="frozen">冻结</option>
                  <option value="closed">已销户</option>
                  <option value="dormant">休眠</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>年利率 (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="ant-input"
                  placeholder="请输入年利率"
                  value={processFormData.interest_rate}
                  onChange={(e) => setProcessFormData({ ...processFormData, interest_rate: e.target.value })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>透支额度</label>
                <input
                  type="number"
                  className="ant-input"
                  placeholder="请输入透支额度"
                  value={processFormData.overdraft_limit}
                  onChange={(e) => setProcessFormData({ ...processFormData, overdraft_limit: e.target.value })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: '#6b7280' }}>备注</label>
                <textarea
                  className="ant-input"
                  placeholder="请输入备注信息"
                  value={processFormData.remarks}
                  onChange={(e) => setProcessFormData({ ...processFormData, remarks: e.target.value })}
                  style={{ width: '100%', marginTop: 4, minHeight: 60 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 500, color: '#92400e', marginBottom: 4 }}>提示</div>
              <div style={{ color: '#78350f' }}>
                提交后，系统将自动录入回函意见（默认"信息一致"），并将函证状态更新为"处理完成"，提交至复核经理审核。
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
