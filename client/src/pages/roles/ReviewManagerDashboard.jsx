import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, message, Tabs, Tag, Form, Radio, Input } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, FileSearchOutlined, AuditOutlined } from '@ant-design/icons';
import { confirmationAPI, replyOpinionAPI, stampRecordAPI } from '../../services/api';
import ConfirmationTable from '../../components/ConfirmationTable';
import dayjs from 'dayjs';

export default function ReviewManagerDashboard() {
  const [tabActive, setTabActive] = useState('pending');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    loadList();
  }, [tabActive]);

  const loadList = async () => {
    setLoading(true);
    try {
      const statusMap = {
        pending: 'review_pending',
        reviewed: 'stamped,review_rejected',
        completed: 'archived',
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

  const handleStartReview = (record) => {
    setSelectedRecord(record);
    reviewForm.resetFields();
    setShowReviewModal(true);
  };

  const handleReview = async (values) => {
    try {
      const { result, review_comments } = values;
      
      if (result === 'pass') {
        const reviewResponse = await confirmationAPI.review(selectedRecord.id, {
          result: 'approved',
          review_comments,
          reviewed_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
        });
        
        if (!reviewResponse.success) {
          throw new Error(reviewResponse.message || '复核通过失败');
        }
        
        const stampResponse = await stampRecordAPI.create({
          confirmation_id: selectedRecord.id,
          stamp_type: 'official',
          stamped_by: 'review_manager',
          stamped_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          remarks: '电子盖章 - 复核通过'
        });
        
        if (stampResponse.success) {
          message.success('复核通过，电子盖章完成');
          setShowReviewModal(false);
          loadList();
        } else {
          throw new Error(stampResponse.message || '盖章失败');
        }
      } else {
        const reviewResponse = await confirmationAPI.review(selectedRecord.id, {
          result: 'rejected',
          review_comments,
          reviewed_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
        });
        
        if (reviewResponse.success) {
          message.success('已驳回，函证退回银行处理');
          setShowReviewModal(false);
          loadList();
        } else {
          throw new Error(reviewResponse.message || '复核驳回失败');
        }
      }
    } catch (e) {
      message.error('复核失败: ' + e.message);
    }
  };

  const tabItems = [
    { key: 'pending', label: `待复核 (${list.filter(i => i.status === 'review_pending').length})` },
    { key: 'reviewed', label: `已复核 (${list.filter(i => ['stamped', 'review_rejected'].includes(i.status)).length})` },
    { key: 'completed', label: `已归档 (${list.filter(i => i.status === 'archived').length})` },
    { key: 'all', label: '全部' }
  ];

  const quickActions = [
    {
      title: '待复核函证',
      icon: <FileSearchOutlined />,
      count: list.filter(i => i.status === 'review_pending').length,
      action: () => setTabActive('pending'),
      color: '#e6a23c',
      description: '需要复核的函证'
    },
    {
      title: '已通过',
      icon: <CheckCircleOutlined />,
      count: list.filter(i => i.status === 'stamped').length,
      action: () => setTabActive('reviewed'),
      color: '#67c23a',
      description: '复核通过并盖章'
    },
    {
      title: '已驳回',
      icon: <CloseCircleOutlined />,
      count: list.filter(i => i.status === 'review_rejected').length,
      action: () => setTabActive('reviewed'),
      color: '#f56c6c',
      description: '已驳回的函证'
    },
    {
      title: '全部函证',
      icon: <AuditOutlined />,
      count: list.length,
      action: () => setTabActive('all'),
      color: '#1677ff',
      description: '查看所有函证'
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">复核经理工作台</h1>
        <p className="page-description">
          审核银行经办录入的账户明细和回函意见，通过或驳回处理结果
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
          <Tag color="processing">提示</Tag>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            复核通过后将自动进行电子盖章，完成整个处理流程
          </span>
        </div>
        <ConfirmationTable
          data={list}
          loading={loading}
        />
      </Card>

      <Modal
        title="复核函证"
        open={showReviewModal}
        onCancel={() => setShowReviewModal(false)}
        footer={null}
        width={600}
      >
        {selectedRecord && (
          <Form
            form={reviewForm}
            layout="vertical"
            onFinish={handleReview}
          >
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f7fa', borderRadius: 6 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>函证信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div>函证编号: <span style={{ fontFamily: 'monospace' }}>{selectedRecord.confirmation_code}</span></div>
                <div>客户: {selectedRecord.client_name}</div>
                <div>银行: {selectedRecord.bank_name}</div>
                <div>账户: <span style={{ fontFamily: 'monospace' }}>{selectedRecord.account_no}</span></div>
              </div>
            </div>

            <Form.Item
              name="result"
              label="复核结果"
              rules={[{ required: true, message: '请选择复核结果' }]}
            >
              <Radio.Group>
                <Radio.Button value="pass" style={{ color: '#52c41a', borderColor: '#b7eb8f' }}>
                  <CheckCircleOutlined /> 复核通过
                </Radio.Button>
                <Radio.Button value="reject" style={{ color: '#ff4d4f', borderColor: '#ffa39e' }}>
                  <CloseCircleOutlined /> 驳回重处理
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="review_comments"
              label="复核意见"
              rules={[{ required: true, message: '请输入复核意见' }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="请输入复核意见，如存在差异请描述具体差异内容..."
              />
            </Form.Item>

            <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 500, color: '#1890ff', marginBottom: 4 }}>说明</div>
              <div style={{ color: '#0050b3' }}>
                选择"复核通过"后，系统将自动进行电子盖章，将函证状态更新为"已盖章"。
                <br />选择"驳回重处理"将退回银行经办人重新处理。
              </div>
            </div>

            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => setShowReviewModal(false)}>取消</Button>
                <Button type="primary" htmlType="submit">确认提交</Button>
              </div>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
