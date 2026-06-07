import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Button, Space, Modal, message, Timeline, Descriptions, Table } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, FileTextOutlined, SafetyOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { confirmationAPI, authorizationAPI, accountDetailAPI, replyOpinionAPI, stampRecordAPI } from '../services/api';
import StatusStepper from '../components/StatusStepper';
import { getStatusLabel, getStatusColor, OPINION_TYPE_MAP, STAMP_TYPE_MAP } from '../utils/constants';
import dayjs from 'dayjs';

export default function ConfirmationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accountDetail, setAccountDetail] = useState(null);
  const [replyOpinion, setReplyOpinion] = useState(null);
  const [stampRecord, setStampRecord] = useState(null);
  const [authorization, setAuthorization] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadDetail();
  }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const [detailRes, authRes, accountRes, opinionRes, stampRes, logsRes] = await Promise.all([
        confirmationAPI.getById(id),
        authorizationAPI.list({ confirmation_id: id }).catch(() => ({ success: false, data: [] })),
        accountDetailAPI.list({ confirmation_id: id }).catch(() => ({ success: false, data: [] })),
        replyOpinionAPI.list({ confirmation_id: id }).catch(() => ({ success: false, data: [] })),
        stampRecordAPI.list({ confirmation_id: id }).catch(() => ({ success: false, data: [] })),
        confirmationAPI.getLogs(id).catch(() => ({ success: false, data: [] }))
      ]);

      if (detailRes.success) {
        setDetail(detailRes.data);
      }
      if (authRes.success) {
        setAuthorization(authRes.data?.list?.[0] || null);
      }
      if (accountRes.success) {
        setAccountDetail(accountRes.data?.list?.[0] || null);
      }
      if (opinionRes.success) {
        setReplyOpinion(opinionRes.data?.list?.[0] || null);
      }
      if (stampRes.success) {
        setStampRecord(stampRes.data?.list?.[0] || null);
      }
      if (logsRes.success) {
        setLogs(logsRes.data?.list || []);
      }
    } catch (e) {
      message.error('加载详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    Modal.confirm({
      title: '提交确认',
      content: `确定要提交函证 [${detail.confirmation_code}]吗？\n\n注意：如果未上传授权书将无法提交。`,
      okText: '确认提交',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await confirmationAPI.submit(id);
          if (response.success) {
            message.success('提交成功');
            loadDetail();
          } else {
            if (response.error === 'NO_AUTHORIZATION') {
              Modal.error({
                title: '提交失败 - 授权书缺失',
                content: (
                  <div>
                    <p style={{ color: '#dc2626', fontWeight: 500, fontSize: 14 }}>{response.message}</p>
                    <p style={{ marginTop: 12, color: '#374151' }}>该询证函尚未上传授权书，请先上传授权书后再提交。</p>
                    <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 6 }}>
                      <p style={{ fontWeight: 500, color: '#92400e' }}>业务规则说明：</p>
                      <p style={{ color: '#78350f', fontSize: 12 }}>根据《银行函证业务规范》，银行询证函必须附有审计客户的授权书才能被银行受理。</p>
                    </div>
                  </div>
                ),
                okText: '知道了'
              });
            } else {
              message.error(response.message || '提交失败');
            }
          }
        } catch (e) {
          const errorData = e.response?.data;
          if (errorData?.error === 'NO_AUTHORIZATION') {
            Modal.error({
              title: '提交失败 - 授权书缺失',
              content: (
                <div>
                  <p style={{ color: '#dc2626', fontWeight: 500, fontSize: 14 }}>{errorData.message || '授权书缺失，不得受理'}</p>
                  <p style={{ marginTop: 12, color: '#374151' }}>该询证函尚未上传授权书，请先上传授权书后再提交。</p>
                  <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 6 }}>
                    <p style={{ fontWeight: 500, color: '#92400e' }}>业务规则说明：</p>
                    <p style={{ color: '#78350f', fontSize: 12 }}>根据《银行函证业务规范》，银行询证函必须附有审计客户的授权书才能被银行受理。</p>
                  </div>
                </div>
              ),
              okText: '知道了'
            });
          } else {
            message.error(e.response?.data?.message || '提交失败');
          }
        }
      }
    });
  };

  const handleArchive = async () => {
    Modal.confirm({
      title: '归档确认',
      content: '确定要将此函证归档吗？归档后将无法修改。',
      okText: '确认归档',
      onOk: async () => {
        try {
          const response = await confirmationAPI.archive(id);
          if (response.success) {
            message.success('归档成功');
            loadDetail();
          } else {
            message.error(response.message || '归档失败');
          }
        } catch (e) {
          message.error('归档失败');
        }
      }
    });
  };

  const renderActions = () => {
    if (!detail) return null;
    const actions = [];

    if (hasRole('audit_firm')) {
      if (detail.status === 'draft' || detail.status === 'authorization_rejected') {
        actions.push(
          <Button key="submit" type="primary" onClick={handleSubmit}>
            提交
          </Button>
        );
      }
    }

    if (hasRole('audit_client') && detail.status === 'authorization_pending') {
      actions.push(
        <Button key="authorize" type="primary" onClick={() => {
          Modal.confirm({
            title: '确认授权',
            content: '确定要为该函证授权吗？',
            okText: '确认授权',
            onOk: async () => {
              const response = await authorizationAPI.create({
                confirmation_id: id,
                authorization_number: `AUTH-${Date.now()}`,
                authorization_date: dayjs().format('YYYY-MM-DD'),
                scope: 'full',
                authorized_by: user?.name,
                authorization_status: 'approved',
                remarks: '客户已确认授权'
              });
              if (response.success) {
                message.success('授权成功');
                loadDetail();
              } else {
                message.error(response.message || '授权失败');
              }
            }
          });
        }}>
          确认授权
        </Button>
      );
    }

    if (hasRole('bank_clerk') && detail.status === 'processing') {
      actions.push(
        <Button key="process" type="primary" onClick={() => message.info('请前往银行经办工作台处理')}>
          录入账户信息
        </Button>
      );
    }

    if (hasRole('review_manager') && detail.status === 'review_pending') {
      actions.push(
        <Button key="review" type="primary" onClick={() => message.info('请前往复核经理工作台处理')}>
          复核
        </Button>
      );
    }

    if (detail.status === 'stamped' && !detail.archived_at) {
      actions.push(
        <Button key="archive" type="primary" onClick={handleArchive}>
          归档
        </Button>
      );
    }

    if (detail.status === 'stamped' || detail.status === 'archived') {
      actions.push(
        <Button key="download" icon={<DownloadOutlined />}>
          下载回函
        </Button>
      );
    }

    actions.unshift(
      <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
        返回
      </Button>
    );

    return actions;
  };

  if (loading && !detail) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  if (!detail) {
    return <div style={{ padding: 24 }}>未找到该函证信息</div>;
  }

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name'
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks'
    }
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            询证函详情
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>{detail.confirmation_code}</span>
            <Tag color={getStatusColor(detail.status)}>{getStatusLabel(detail.status)}</Tag>
            {detail.has_authorization ? 
              <Tag color="success" icon={<SafetyOutlined />}>已授权</Tag> :
              <Tag color="error" icon={<SafetyOutlined />}>未授权</Tag>
            }
          </div>
        </div>
        <Space>{renderActions()}</Space>
      </div>

      <StatusStepper status={detail.status} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="基本信息" className="detail-section">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="函证编号">{detail.confirmation_code}</Descriptions.Item>
              <Descriptions.Item label="函证类型">{detail.confirmation_type}</Descriptions.Item>
              <Descriptions.Item label="审计客户">{detail.client_name}</Descriptions.Item>
              <Descriptions.Item label="会计师事务所">{detail.audit_firm_name || '测试会计师事务所'}</Descriptions.Item>
              <Descriptions.Item label="银行">{detail.bank_name}</Descriptions.Item>
              <Descriptions.Item label="账户号码">{detail.account_no}</Descriptions.Item>
              <Descriptions.Item label="币种">{detail.currency}</Descriptions.Item>
              <Descriptions.Item label="询证余额">¥{detail.requested_balance?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="函证日期">{dayjs(detail.confirmation_date).format('YYYY-MM-DD')}</Descriptions.Item>
              <Descriptions.Item label="截止日期">{dayjs(detail.as_of_date).format('YYYY-MM-DD')}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{dayjs(detail.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{dayjs(detail.updated_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            </Descriptions>
          </Card>

          {detail.remarks && (
            <Card title="函证说明" className="detail-section">
              <p style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{detail.remarks}</p>
            </Card>
          )}

          {authorization && (
            <Card 
              title={<span><SafetyOutlined style={{ color: '#52c41a', marginRight: 8 }} />授权书信息</span>} 
              className="detail-section"
            >
              <Descriptions column={2} size="small">
                <Descriptions.Item label="授权书编号">{authorization.authorization_number}</Descriptions.Item>
                <Descriptions.Item label="授权日期">{dayjs(authorization.authorization_date).format('YYYY-MM-DD')}</Descriptions.Item>
                <Descriptions.Item label="授权范围">{authorization.scope === 'full' ? '全部授权' : authorization.scope}</Descriptions.Item>
                <Descriptions.Item label="授权人">{authorization.authorized_by}</Descriptions.Item>
                <Descriptions.Item label="授权状态">
                  <Tag color={authorization.authorization_status === 'approved' ? 'success' : 'processing'}>
                    {authorization.authorization_status === 'approved' ? '已授权' : '待确认'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">{dayjs(authorization.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              </Descriptions>
              {authorization.remarks && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>备注</div>
                  <div>{authorization.remarks}</div>
                </div>
              )}
            </Card>
          )}

          {accountDetail && (
            <Card 
              title={<span><FileTextOutlined style={{ color: '#1677ff', marginRight: 8 }} />账户明细</span>} 
              className="detail-section"
            >
              <Descriptions column={2} size="small">
                <Descriptions.Item label="账户余额">¥{accountDetail.balance?.toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="币种">{accountDetail.currency}</Descriptions.Item>
                <Descriptions.Item label="账户类型">
                  {accountDetail.account_type === 'savings' ? '储蓄账户' : 
                   accountDetail.account_type === 'current' ? '活期账户' :
                   accountDetail.account_type === 'fixed' ? '定期账户' : accountDetail.account_type}
                </Descriptions.Item>
                <Descriptions.Item label="账户状态">
                  <Tag color={accountDetail.account_status === 'normal' ? 'success' : 'warning'}>
                    {accountDetail.account_status === 'normal' ? '正常' : 
                     accountDetail.account_status === 'frozen' ? '冻结' :
                     accountDetail.account_status === 'closed' ? '已销户' : accountDetail.account_status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="年利率">{accountDetail.interest_rate ? `${accountDetail.interest_rate}%` : '-'}</Descriptions.Item>
                <Descriptions.Item label="透支额度">{accountDetail.overdraft_limit ? `¥${accountDetail.overdraft_limit.toLocaleString()}` : '-'}</Descriptions.Item>
                <Descriptions.Item label="截止日期">{dayjs(accountDetail.as_of_date).format('YYYY-MM-DD')}</Descriptions.Item>
                <Descriptions.Item label="录入时间">{dayjs(accountDetail.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              </Descriptions>
              {accountDetail.remarks && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>备注</div>
                  <div>{accountDetail.remarks}</div>
                </div>
              )}
            </Card>
          )}

          {replyOpinion && (
            <Card 
              title={<span><CheckCircleOutlined style={{ color: '#722ed1', marginRight: 8 }} />回函意见</span>} 
              className="detail-section"
            >
              <Descriptions column={2} size="small">
                <Descriptions.Item label="意见类型">
                  <Tag color={OPINION_TYPE_MAP[replyOpinion.opinion_type]?.color}>
                    {OPINION_TYPE_MAP[replyOpinion.opinion_type]?.label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="确认人">{replyOpinion.confirmed_by}</Descriptions.Item>
                <Descriptions.Item label="确认时间" span={2}>
                  {dayjs(replyOpinion.confirmed_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              </Descriptions>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>意见内容</div>
                <div style={{ padding: 12, background: '#f5f7fa', borderRadius: 6 }}>
                  {replyOpinion.opinion_content}
                </div>
              </div>
            </Card>
          )}

          {stampRecord && (
            <Card 
              title={<span><SafetyOutlined style={{ color: '#fa8c16', marginRight: 8 }} />盖章记录</span>} 
              className="detail-section"
            >
              <Descriptions column={2} size="small">
                <Descriptions.Item label="盖章类型">
                  <Tag color={STAMP_TYPE_MAP[stampRecord.stamp_type]?.color}>
                    {STAMP_TYPE_MAP[stampRecord.stamp_type]?.label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="盖章人">{stampRecord.stamped_by}</Descriptions.Item>
                <Descriptions.Item label="盖章时间" span={2}>
                  {dayjs(stampRecord.stamped_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="数字签名" span={2}>
                  <code style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                    {stampRecord.digital_signature}
                  </code>
                </Descriptions.Item>
              </Descriptions>
              {stampRecord.remarks && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>备注</div>
                  <div>{stampRecord.remarks}</div>
                </div>
              )}
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="处理进度" className="timeline-container">
            {logs.length > 0 ? (
              <Timeline
                mode="left"
                items={logs.map((log, index) => ({
                  color: index === logs.length - 1 ? '#1677ff' : '#d9d9d9',
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>{log.action}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        {dayjs(log.created_at).format('YYYY-MM-DD HH:mm')}
                        {' · '}
                        {log.operator_name}
                      </div>
                      {log.remarks && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                          {log.remarks}
                        </div>
                      )}
                    </div>
                  )
                }))}
              />
            ) : (
              <div className="empty-state">
                <ClockCircleOutlined style={{ fontSize: 48, marginBottom: 12 }} />
                <div>暂无操作记录</div>
              </div>
            )}
          </Card>

          {logs.length > 0 && (
            <Card title="操作日志" className="detail-section" style={{ marginTop: 16 }}>
              <Table
                columns={logColumns}
                dataSource={logs}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 300 }}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
