import React, { useState, useEffect } from 'react';
import { Input, Select, Button, Form, Card, Tabs, Tag, message } from 'antd';
import { SearchOutlined, PlusOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { confirmationAPI, masterDataAPI } from '../services/api';
import ConfirmationTable from '../components/ConfirmationTable';
import { STATUS_MAP } from '../utils/constants';

const { Option } = Select;

export default function ConfirmationListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasRole } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tabActive, setTabActive] = useState('all');
  const [form] = Form.useForm();
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const initialStatus = searchParams.get('status') || 'all';

  useEffect(() => {
    if (initialStatus && initialStatus !== 'all') {
      setTabActive(initialStatus);
    }
  }, [initialStatus]);

  useEffect(() => {
    loadList();
  }, [tabActive, pagination]);

  const loadList = async (filters = {}) => {
    setLoading(true);
    try {
      const statusMap = {
        all: '',
        draft: 'draft',
        pending: 'submitted,authorization_pending',
        processing: 'processing,processed',
        review: 'review_pending',
        completed: 'stamped,archived',
        rejected: 'authorization_rejected,review_rejected'
      };

      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters
      };

      if (tabActive !== 'all' && !filters.status) {
        params.status = statusMap[tabActive] || tabActive;
      }

      const response = await confirmationAPI.list(params);
      if (response.success) {
        setList(response.data.list || []);
        setTotal(response.data.total || 0);
      }
    } catch (e) {
      message.error('加载列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (values) => {
    setPagination({ ...pagination, current: 1 });
    loadList(values);
  };

  const handleReset = () => {
    form.resetFields();
    setPagination({ current: 1, pageSize: 10 });
    loadList();
  };

  const handleTableChange = (page) => {
    setPagination({ current: page.current, pageSize: page.pageSize });
  };

  const tabItems = [
    { key: 'all', label: '全部' },
    { key: 'draft', label: `草稿 (${list.filter(i => i.status === 'draft').length})` },
    { key: 'pending', label: `待处理 (${list.filter(i => ['submitted', 'authorization_pending'].includes(i.status)).length})` },
    { key: 'processing', label: `处理中 (${list.filter(i => ['processing', 'processed'].includes(i.status)).length})` },
    { key: 'review', label: `待复核 (${list.filter(i => i.status === 'review_pending').length})` },
    { key: 'completed', label: `已完成 (${list.filter(i => ['stamped', 'archived'].includes(i.status)).length})` },
    { key: 'rejected', label: `已驳回 (${list.filter(i => ['authorization_rejected', 'review_rejected'].includes(i.status)).length})` }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">询证函列表</h1>
          <p className="page-description">
            查看和管理所有银行询证函
          </p>
        </div>
        {hasRole('audit_firm') && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/confirmations/create')}
          >
            新建询证函
          </Button>
        )}
      </div>

      <Card className="card-shadow filter-bar">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          initialValues={{ status: '' }}
        >
          <Form.Item name="confirmation_code" label="函证编号">
            <Input placeholder="请输入函证编号" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="client_name" label="客户名称">
            <Input placeholder="请输入客户名称" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="bank_name" label="银行">
            <Input placeholder="请输入银行名称" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部状态" style={{ width: 140 }} allowClear>
              {Object.entries(STATUS_MAP).map(([key, value]) => (
                <Option key={key} value={key}>{value.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset} style={{ marginLeft: 8 }}>
              重置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card className="card-shadow">
        <Tabs
          activeKey={tabActive}
          onChange={(key) => {
            setTabActive(key);
            setPagination({ current: 1, pageSize: 10 });
          }}
          items={tabItems}
          size="small"
        />
        <ConfirmationTable
          data={list}
          loading={loading}
        />
      </Card>
    </div>
  );
}
