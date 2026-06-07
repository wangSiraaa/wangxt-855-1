import React from 'react';
import { Table, Tag, Button, Space } from 'antd';
import { EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getStatusLabel, getStatusColor, CONFIRMATION_TYPE_MAP } from '../utils/constants';
import dayjs from 'dayjs';

export default function ConfirmationTable({ data, loading, showActions = true }) {
  const navigate = useNavigate();

  const columns = [
    {
      title: '函证编号',
      dataIndex: 'confirmation_code',
      key: 'confirmation_code',
      width: 140,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', color: '#1677ff' }}>{text}</span>
      )
    },
    {
      title: '函证类型',
      dataIndex: 'confirmation_type',
      key: 'confirmation_type',
      width: 100,
      render: (type) => {
        const info = CONFIRMATION_TYPE_MAP[type] || {};
        return <Tag color={info.color}>{info.label || type}</Tag>;
      }
    },
    {
      title: '审计客户',
      dataIndex: 'client_name',
      key: 'client_name',
      width: 120,
      ellipsis: true
    },
    {
      title: '银行',
      dataIndex: 'bank_name',
      key: 'bank_name',
      width: 120,
      ellipsis: true
    },
    {
      title: '账户',
      dataIndex: 'account_no',
      key: 'account_no',
      width: 140,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>
    },
    {
      title: '币种',
      dataIndex: 'currency',
      key: 'currency',
      width: 70
    },
    {
      title: '授权书',
      dataIndex: 'has_authorization',
      key: 'has_authorization',
      width: 80,
      render: (has) => (
        has ? 
          <Tag color="success">已上传</Tag> : 
          <Tag color="error">未上传</Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 140,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm')
    }
  ];

  if (showActions) {
    columns.push({
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/confirmations/${record.id}`)}
          >
            查看
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => navigate(`/confirmations/${record.id}/edit`)}
            >
              编辑
            </Button>
          )}
        </Space>
      )
    });
  }

  return (
    <div className="table-container">
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
}
