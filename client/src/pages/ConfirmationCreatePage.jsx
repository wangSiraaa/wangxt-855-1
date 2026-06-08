import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, InputNumber, Button, Row, Col, DatePicker, message, Alert } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { confirmationAPI, authorizationAPI, masterDataAPI } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

export default function ConfirmationCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [banks, setBanks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [clientsRes, banksRes] = await Promise.all([
        masterDataAPI.getClients(),
        masterDataAPI.getBanks()
      ]);
      
      if (clientsRes.success) {
        setClients(clientsRes.data || []);
      }
      if (banksRes.success) {
        setBanks(banksRes.data || []);
      }
    } catch (e) {
      message.error('加载基础数据失败');
    }
  };

  const handleClientChange = async (clientId) => {
    if (clientId) {
      try {
        const response = await masterDataAPI.getAccounts({ client_id: clientId });
        if (response.success) {
          setAccounts(response.data || []);
        }
      } catch (e) {
        console.error('加载账户列表失败', e);
      }
    } else {
      setAccounts([]);
    }
  };

  const handleAccountChange = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      form.setFieldsValue({
        bank_id: account.bank_id,
        account_no: account.account_no,
        currency: account.currency
      });
    }
  };

  const handleSave = async (values, submitAfter = false) => {
    const payload = {
      ...values,
      firm_id: user?.id,
      audit_period: values.audit_period || '2024年度',
      content: values.content || `请确认该账户截至${values.as_of_date?.format('YYYY-MM-DD')}的余额是否正确。`,
      has_authorization: false,
      confirmation_date: values.confirmation_date?.format('YYYY-MM-DD'),
      as_of_date: values.as_of_date?.format('YYYY-MM-DD')
    };

    if (submitAfter) {
      setSubmitting(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await confirmationAPI.create(payload);
      
      if (response.success) {
        const confirmationId = response.data.id;
        
        if (submitAfter) {
          setShowAuthWarning(true);
          
          try {
            const submitResponse = await confirmationAPI.submit(confirmationId);
            
            if (submitResponse.success) {
              message.success('创建并提交成功');
              navigate(`/confirmations/${confirmationId}`);
            } else {
              if (submitResponse.error === 'NO_AUTHORIZATION') {
                message.warning('创建成功，但提交失败：授权书缺失');
                navigate(`/confirmations/${confirmationId}`);
              } else {
                message.error(submitResponse.message || '提交失败');
                navigate(`/confirmations/${confirmationId}`);
              }
            }
          } catch (e) {
            const errorData = e.response?.data;
            if (errorData?.error === 'NO_AUTHORIZATION') {
              message.warning('创建成功，但提交失败：授权书缺失');
              navigate(`/confirmations/${confirmationId}`);
            } else {
              message.error(errorData?.message || '提交失败');
              navigate(`/confirmations/${confirmationId}`);
            }
          }
        } else {
          message.success('创建成功');
          navigate(`/confirmations/${confirmationId}`);
        }
      } else {
        message.error(response.message || '创建失败');
      }
    } catch (e) {
      message.error('操作失败: ' + e.message);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const onFinish = (values) => {
    handleSave(values, false);
  };

  const handleSaveAndSubmit = async () => {
    try {
      const values = await form.validateFields();
      handleSave(values, true);
    } catch (e) {
      console.error('表单验证失败', e);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>新建询证函</h1>
          <p className="page-description">填写银行询证函信息并提交</p>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
      </div>

      {showAuthWarning && (
        <Alert
          message="重要提示"
          description={
            <div>
              <p><strong>授权书缺失，不得受理。</strong></p>
              <p>根据《银行函证业务规范》，银行询证函必须附有审计客户的授权书才能被银行受理。</p>
              <p>您可以先保存为草稿，上传授权书后再进行提交。</p>
            </div>
          }
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      <Card className="form-container">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            confirmation_date: dayjs(),
            as_of_date: dayjs(),
            currency: 'CNY',
            confirmation_type: 'balance',
            created_by: user?.id
          }}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="client_id"
                label="审计客户"
                rules={[{ required: true, message: '请选择审计客户' }]}
              >
                <Select
                  placeholder="请选择审计客户"
                  onChange={handleClientChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {clients.map(client => (
                    <Option key={client.id} value={client.id}>
                      {client.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="account_id"
                label="银行账户"
                rules={[{ required: true, message: '请选择银行账户' }]}
              >
                <Select
                  placeholder="请先选择审计客户，再选择账户"
                  onChange={handleAccountChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {accounts.map(account => (
                    <Option key={account.id} value={account.id}>
                      {account.account_no} - {account.account_name} ({account.bank_name})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="bank_id"
                label="银行"
                rules={[{ required: true, message: '请选择银行' }]}
              >
                <Select placeholder="请选择银行" showSearch optionFilterProp="children">
                  {banks.map(bank => (
                    <Option key={bank.id} value={bank.id}>
                      {bank.name} - {bank.branch}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="account_no"
                label="账户号码"
                rules={[{ required: true, message: '请输入账户号码' }]}
              >
                <Input placeholder="请输入账户号码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="confirmation_type"
                label="询证类型"
                rules={[{ required: true, message: '请选择询证类型' }]}
              >
                <Select placeholder="请选择询证类型">
                  <Option value="balance">余额询证</Option>
                  <Option value="transaction">交易询证</Option>
                  <Option value="other">其他询证</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="currency"
                label="币种"
                rules={[{ required: true, message: '请选择币种' }]}
              >
                <Select placeholder="请选择币种">
                  <Option value="CNY">人民币 (CNY)</Option>
                  <Option value="USD">美元 (USD)</Option>
                  <Option value="EUR">欧元 (EUR)</Option>
                  <Option value="GBP">英镑 (GBP)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="requested_balance"
                label="询证余额"
                rules={[{ required: true, message: '请输入询证余额' }]}
              >
                <InputNumber
                  placeholder="请输入询证余额"
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="confirmation_date"
                label="函证日期"
                rules={[{ required: true, message: '请选择函证日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="as_of_date"
                label="截止日期"
                rules={[{ required: true, message: '请选择截止日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="remarks"
            label="备注说明"
          >
            <TextArea
              rows={4}
              placeholder="请输入备注说明，如有特殊询证要求可在此说明"
            />
          </Form.Item>

          <Form.Item noStyle>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 12,
              marginTop: 24,
              paddingTop: 24,
              borderTop: '1px solid #e5e7eb'
            }}>
              <Button onClick={() => navigate(-1)}>
                取消
              </Button>
              <Button 
                icon={<SaveOutlined />} 
                loading={loading}
                onClick={() => form.submit()}
              >
                保存草稿
              </Button>
              <Button 
                type="primary" 
                icon={<SendOutlined />} 
                loading={submitting}
                onClick={handleSaveAndSubmit}
              >
                保存并提交
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>

      <Card className="detail-section" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <SafetyOutlined style={{ fontSize: 24, color: '#faad14', marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>关于授权书</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
              <p>• 根据《银行函证业务规范》，银行询证函必须附有审计客户的授权书才能被银行受理。</p>
              <p>• 授权书是审计客户授权银行向会计师事务所提供账户信息的法律文件。</p>
              <p>• 如果未上传授权书就提交，系统将自动拒绝并提示"授权书缺失，不得受理"。</p>
              <p>• 您可以先保存为草稿，上传授权书后再进行提交操作。</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
