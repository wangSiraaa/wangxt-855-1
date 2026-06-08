import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Modal, Form, Radio, Input, message, Tag, Tabs, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, FileTextOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { todoTaskAPI, confirmationAPI } from '../services/api';
import { getStatusLabel, getStatusColor } from '../utils/constants';
import dayjs from 'dayjs';

const { TextArea } = Input;

const TASK_TYPE_MAP = {
  second_confirmation: { label: '二次确认', color: '#1677ff' },
  review: { label: '复核', color: '#52c41a' },
  authorization: { label: '授权', color: '#fa8c16' },
  stamp: { label: '盖章', color: '#eb2f96' },
  archive: { label: '归档', color: '#722ed1' }
};

const TASK_STATUS_MAP = {
  pending: { label: '待处理', color: '#faad14' },
  processing: { label: '处理中', color: '#1677ff' },
  completed: { label: '已完成', color: '#52c41a' },
  rejected: { label: '已驳回', color: '#ff4d4f' },
  cancelled: { label: '已取消', color: '#8c8c8c' }
};

const PRIORITY_MAP = {
  high: { label: '高', color: '#ff4d4f' },
  medium: { label: '中', color: '#faad14' },
  low: { label: '低', color: '#52c41a' }
};

export default function TodoTaskPage() {
  const navigate = useNavigate();
  const [tabActive, setTabActive] = useState('pending');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirmationDetail, setConfirmationDetail] = useState(null);
  const [confirmForm] = Form.useForm();

  useEffect(() => {
    loadList();
  }, [tabActive]);

  const loadList = async () => {
    setLoading(true);
    try {
      const params = {};
      if (tabActive !== 'all') {
        params.status = tabActive;
      }
      
      const response = await todoTaskAPI.myTasks(params);
      if (response.success) {
        setList(response.data || []);
      }
    } catch (e) {
      message.error('加载待办任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSecondConfirm = (task) => {
    setSelectedTask(task);
    confirmForm.resetFields();
    setShowConfirmModal(true);
  };

  const loadConfirmationDetail = async (confirmationId) => {
    try {
      const response = await confirmationAPI.getById(confirmationId);
      if (response.success) {
        setConfirmationDetail(response.data);
      }
    } catch (e) {
      message.error('加载询证函详情失败');
    }
  };

  const handleViewDetail = async (task) => {
    setSelectedTask(task);
    setConfirmationDetail(null);
    setShowDetailModal(true);
    await loadConfirmationDetail(task.confirmation_id);
  };

  const handleSubmitConfirm = async (values) => {
    try {
      const { result, remark } = values;
      
      const response = await todoTaskAPI.secondConfirm(selectedTask.id, {
        approved: result === 'pass',
        remark: remark || ''
      });
      
      if (response.success) {
        message.success(response.message);
        setShowConfirmModal(false);
        loadList();
      } else {
        throw new Error(response.message);
      }
    } catch (e) {
      message.error('处理失败: ' + e.message);
    }
  };

  const columns = [
    {
      title: '任务类型',
      dataIndex: 'task_type',
      key: 'task_type',
      width: 120,
      render: (type) => (
        <Tag color={TASK_TYPE_MAP[type]?.color}>
          {TASK_TYPE_MAP[type]?.label || type}
        </Tag>
      )
    },
    {
      title: '任务标题',
      dataIndex: 'task_title',
      key: 'task_title',
      render: (text, record) => (
        <a onClick={() => handleViewDetail(record)}>{text}</a>
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority) => (
        <Tag color={PRIORITY_MAP[priority]?.color}>
          {PRIORITY_MAP[priority]?.label || priority}
        </Tag>
      )
    },
    {
      title: '客户',
      dataIndex: 'client_name',
      key: 'client_name',
      width: 150
    },
    {
      title: '银行',
      dataIndex: 'bank_name',
      key: 'bank_name',
      width: 150
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={TASK_STATUS_MAP[status]?.color}>
          {TASK_STATUS_MAP[status]?.label || status}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            查看详情
          </Button>
          {record.status === 'pending' && record.task_type === 'second_confirmation' && (
            <Button type="primary" size="small" onClick={() => handleSecondConfirm(record)}>
              处理
            </Button>
          )}
        </Space>
      )
    }
  ];

  const tabItems = [
    { key: 'pending', label: `待处理 (${list.filter(i => i.status === 'pending').length})` },
    { key: 'completed', label: `已完成 (${list.filter(i => i.status === 'completed').length})` },
    { key: 'rejected', label: `已驳回 (${list.filter(i => i.status === 'rejected').length})` },
    { key: 'all', label: '全部' }
  ];

  const quickActions = [
    {
      title: '待处理任务',
      icon: <ClockCircleOutlined />,
      count: list.filter(i => i.status === 'pending').length,
      action: () => setTabActive('pending'),
      color: '#e6a23c',
      description: '需要处理的任务'
    },
    {
      title: '二次确认',
      icon: <ExclamationCircleOutlined />,
      count: list.filter(i => i.status === 'pending' && i.task_type === 'second_confirmation').length,
      action: () => setTabActive('pending'),
      color: '#409eff',
      description: '需要二次确认'
    },
    {
      title: '已完成',
      icon: <CheckCircleOutlined />,
      count: list.filter(i => i.status === 'completed').length,
      action: () => setTabActive('completed'),
      color: '#67c23a',
      description: '已完成的任务'
    },
    {
      title: '全部任务',
      icon: <FileTextOutlined />,
      count: list.length,
      action: () => setTabActive('all'),
      color: '#1677ff',
      description: '查看所有任务'
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">待办任务中心</h1>
        <p className="page-description">
          处理分配给您的待办任务，包括二次确认、复核、授权等
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
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      <Modal
        title="二次确认处理"
        open={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        footer={null}
        width={600}
      >
        {selectedTask && (
          <Form
            form={confirmForm}
            layout="vertical"
            onFinish={handleSubmitConfirm}
          >
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f7fa', borderRadius: 6 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>任务信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div>任务标题: {selectedTask.task_title}</div>
                <div>优先级: <Tag color={PRIORITY_MAP[selectedTask.priority]?.color}>{PRIORITY_MAP[selectedTask.priority]?.label}</Tag></div>
                <div>创建人: {selectedTask.creator_name}</div>
                <div>创建时间: {dayjs(selectedTask.created_at).format('YYYY-MM-DD HH:mm')}</div>
              </div>
            </div>

            <Form.Item
              name="result"
              label="确认结果"
              rules={[{ required: true, message: '请选择确认结果' }]}
            >
              <Radio.Group>
                <Radio.Button value="pass" style={{ color: '#52c41a', borderColor: '#b7eb8f' }}>
                  <CheckCircleOutlined /> 确认通过
                </Radio.Button>
                <Radio.Button value="reject" style={{ color: '#ff4d4f', borderColor: '#ffa39e' }}>
                  <CloseCircleOutlined /> 驳回重处理
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="remark"
              label="处理意见"
              rules={[{ required: true, message: '请输入处理意见' }]}
            >
              <TextArea
                rows={4}
                placeholder="请输入处理意见，如存在差异请描述具体差异内容..."
              />
            </Form.Item>

            <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 500, color: '#1890ff', marginBottom: 4 }}>说明</div>
              <div style={{ color: '#0050b3' }}>
                选择"确认通过"后，函证状态将更新为"待复核"，进入正式复核流程。
                <br />选择"驳回重处理"将退回银行经办人重新处理。
              </div>
            </div>

            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => setShowConfirmModal(false)}>取消</Button>
                <Button type="primary" htmlType="submit">确认提交</Button>
              </div>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="任务详情"
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={null}
        width={800}
      >
        {selectedTask && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f7fa', borderRadius: 6 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>任务信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div>任务类型: <Tag color={TASK_TYPE_MAP[selectedTask.task_type]?.color}>{TASK_TYPE_MAP[selectedTask.task_type]?.label}</Tag></div>
                <div>优先级: <Tag color={PRIORITY_MAP[selectedTask.priority]?.color}>{PRIORITY_MAP[selectedTask.priority]?.label}</Tag></div>
                <div>状态: <Tag color={TASK_STATUS_MAP[selectedTask.status]?.color}>{TASK_STATUS_MAP[selectedTask.status]?.label}</Tag></div>
                <div>创建人: {selectedTask.creator_name}</div>
                <div>创建时间: {dayjs(selectedTask.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                {selectedTask.completed_at && (
                  <div>完成时间: {dayjs(selectedTask.completed_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 12 }}>任务描述: {selectedTask.task_description}</div>
            </div>

            {confirmationDetail && (
              <div>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>询证函信息</div>
                <div style={{ padding: 12, background: '#f0f5ff', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>函证编号: <span style={{ fontFamily: 'monospace' }}>{confirmationDetail.confirmation_no}</span></div>
                    <div>当前状态: <Tag color={getStatusColor(confirmationDetail.status)}>{getStatusLabel(confirmationDetail.status)}</Tag></div>
                    <div>客户: {confirmationDetail.client_name}</div>
                    <div>银行: {confirmationDetail.bank_name}</div>
                    <div>账户: <span style={{ fontFamily: 'monospace' }}>{confirmationDetail.account_no}</span></div>
                    <div>账户名称: {confirmationDetail.account_name}</div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>询证内容:</strong> {confirmationDetail.content}
                  </div>
                  
                  {confirmationDetail.account_details && confirmationDetail.account_details.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <strong>账户明细:</strong>
                      <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 4 }}>
                        {confirmationDetail.account_details.map((detail, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
                            <div>余额日期: {detail.balance_date}</div>
                            <div>余额: ¥{detail.balance_amount?.toLocaleString()}</div>
                            <div>账户状态: {detail.account_status}</div>
                            <div>币种: {detail.currency}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {confirmationDetail.reply_opinions && confirmationDetail.reply_opinions.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <strong>回函意见:</strong>
                      <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 4 }}>
                        {confirmationDetail.reply_opinions.map((opinion, idx) => (
                          <div key={idx}>
                            <div>意见类型: <Tag color={opinion.opinion_type === 'consistent' ? '#52c41a' : '#ff4d4f'}>
                              {opinion.opinion_type === 'consistent' ? '信息一致' : opinion.opinion_type === 'inconsistent' ? '信息不一致' : '无法确认'}
                            </Tag></div>
                            <div>意见内容: {opinion.content}</div>
                            {opinion.difference_explanation && (
                              <div>差异说明: {opinion.difference_explanation}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              {selectedTask.status === 'pending' && selectedTask.task_type === 'second_confirmation' && (
                <Button type="primary" onClick={() => {
                  setShowDetailModal(false);
                  handleSecondConfirm(selectedTask);
                }}>立即处理</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
