export const STATUS_MAP = {
  draft: { label: '草稿', color: '#909399', step: 0 },
  submitted: { label: '已提交', color: '#409EFF', step: 1 },
  authorization_pending: { label: '待授权审核', color: '#E6A23C', step: 2 },
  authorization_rejected: { label: '授权不通过', color: '#F56C6C', step: 2 },
  processing: { label: '处理中', color: '#409EFF', step: 3 },
  processed: { label: '处理完成', color: '#67C23A', step: 3 },
  review_pending: { label: '待复核', color: '#E6A23C', step: 4 },
  review_rejected: { label: '复核不通过', color: '#F56C6C', step: 4 },
  stamped: { label: '已盖章', color: '#67C23A', step: 5 },
  archived: { label: '已归档', color: '#909399', step: 6 }
};

export const STEPS = [
  { title: '创建草稿', description: '会计师创建询证函草稿' },
  { title: '提交', description: '提交并检查授权书' },
  { title: '授权审核', description: '审计客户确认授权' },
  { title: '银行处理', description: '银行经办录入账户明细和回函意见' },
  { title: '差异复核', description: '复核经理审核回函意见' },
  { title: '电子盖章', description: '对通过审核的回函进行电子盖章' },
  { title: '下载归档', description: '下载已盖章的回函并归档' }
];

export const OPINION_TYPE_MAP = {
  consistent: { label: '信息一致', color: '#67C23A' },
  inconsistent: { label: '信息不一致', color: '#F56C6C' },
  unable_to_confirm: { label: '无法确认', color: '#E6A23C' }
};

export const STAMP_TYPE_MAP = {
  official: { label: '公章', color: '#1677ff' },
  business: { label: '业务章', color: '#52c41a' },
  special: { label: '专用章', color: '#fa8c16' }
};

export const CONFIRMATION_TYPE_MAP = {
  balance: { label: '余额询证', color: '#1677ff' },
  transaction: { label: '交易询证', color: '#52c41a' },
  other: { label: '其他询证', color: '#fa8c16' }
};

export const getStatusLabel = (status) => STATUS_MAP[status]?.label || status;
export const getStatusColor = (status) => STATUS_MAP[status]?.color || '#909399';
export const getStatusStep = (status) => STATUS_MAP[status]?.step ?? 0;
