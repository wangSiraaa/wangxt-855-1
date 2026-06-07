# 银行函证回函协同系统

## 项目概述

银行函证回函协同全栈Web应用，支持会计师事务所、银行经办、复核经理、审计客户等多角色协同工作。实现了从函证提交到归档的完整业务流程，前后端协同开发，确保数据一致性和用户体验。

## 技术栈

### 后端
- **框架**: Node.js + Express
- **数据库**: SQLite3 (关系型数据库，启用外键约束)
- **认证**: JWT Token + bcrypt 密码哈希
- **权限**: 基于角色的访问控制 (RBAC)
- **验证**: Joi Schema 验证
- **日志**: Morgan HTTP 日志

### 前端
- **框架**: React 18 + Vite
- **UI组件**: Ant Design 5.x
- **路由**: React Router 6.x
- **HTTP客户端**: Axios
- **状态管理**: React Context (AuthContext)

## 业务边界

### 数据层覆盖
| 实体 | 说明 | 对应表 |
|------|------|--------|
| 询证函 | 核心业务单据 | confirmations |
| 授权书 | 审计客户授权文件 | authorizations |
| 账户明细 | 银行账户交易明细 | account_details |
| 回函意见 | 银行回函意见 | reply_opinions |
| 盖章记录 | 电子盖章记录 | stamp_records |

### 核心业务规则
> **授权书缺失不得受理** - 提交询证函时必须验证授权书是否存在，不存在则返回 `NO_AUTHORIZATION` 错误码和明确提示。

### 健康检查
- 接口: `GET /api/health`
- 验证数据库连接状态
- 返回系统运行状态和服务健康信息

## 系统角色与权限

| 角色 | 用户名 | 权限入口 | 主要功能 |
|------|--------|----------|----------|
| 会计师事务所 | audit_firm | 工作台、列表、创建、详情 | 创建询证函、上传授权书、提交函证、查看进度、下载归档 |
| 银行经办 | bank_clerk | 工作台、列表、详情 | 录入账户明细、填写回函意见、处理函证 |
| 复核经理 | review_manager | 工作台、列表、详情 | 差异复核、审批回函、电子盖章 |
| 审计客户 | audit_client | 工作台、列表、详情 | 查看函证进度、确认授权 |

## 主业务流程

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  函证提交   │ →  │  授权校验   │ →  │  银行处理   │ →  │  差异复核   │ →  │  电子盖章   │ →  │  下载归档   │
└────────────┘    └────────────┘    └────────────┘    └────────────┘    └────────────┘    └────────────┘
       ↓                ↓                ↓                ↓                ↓                ↓
   draft         authorization_     processing       review_pending      stamped         archived
                 pending/
                 authorization_
                 rejected
```

### 状态流转
- `draft` (草稿) → `submitted` (已提交)
- `submitted` → `authorization_pending` (待授权审核) / `authorization_rejected` (授权被拒)
- `authorization_pending` → `processing` (处理中) / `authorization_rejected`
- `processing` → `processed` (处理完成)
- `processed` → `review_pending` (待复核)
- `review_pending` → `stamped` (已盖章) / `review_rejected` (复核被拒)
- `stamped` → `archived` (已归档)

## 快速开始

### 前置要求
- Node.js >= 16.x
- npm >= 8.x

### 1. 安装依赖

```bash
# 安装所有依赖（根目录 + 后端 + 前端）
npm run install:all
```

### 2. 初始化数据库

```bash
# 创建数据库表并插入测试数据
npm run init:db
```

### 3. 启动开发环境

```bash
# 同时启动后端和前端
npm run dev
```

- **后端服务**: http://localhost:3001
- **前端服务**: http://localhost:5173
- **API文档**: http://localhost:3001/
- **健康检查**: http://localhost:3001/api/health

### 4. 运行 Smoke 测试

```bash
# 执行自动化测试
npm run smoke
```

#### 测试场景
> **提交缺授权书函证并验证前后端均提示不可受理**

测试验证点：
1. ✅ 数据库初始化成功
2. ✅ 后端服务启动正常
3. ✅ 健康检查通过，数据库连接正常
4. ✅ 会计师事务所用户登录成功
5. ✅ 创建不带授权书的询证函草稿
6. ✅ 提交时后端返回 400 状态码
7. ✅ 后端返回 `NO_AUTHORIZATION` 错误码
8. ✅ 错误消息包含"授权书缺失，不得受理"
9. ✅ 前端相关页面包含错误处理逻辑
10. ✅ 前后端协同验证业务规则

## 核心 API 接口

### 认证接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/profile` | 获取当前用户信息 |

### 询证函接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/confirmations` | 创建询证函 | audit_firm |
| GET | `/api/confirmations` | 查询询证函列表 | 所有登录用户 |
| GET | `/api/confirmations/:id` | 获取询证函详情 | 所有登录用户 |
| POST | `/api/confirmations/:id/submit` | 提交询证函 | audit_firm |
| POST | `/api/confirmations/:id/process` | 开始处理 | bank_clerk |
| POST | `/api/confirmations/:id/finish` | 完成处理 | bank_clerk |
| POST | `/api/confirmations/:id/review` | 复核审批 | review_manager |
| POST | `/api/confirmations/:id/archive` | 归档 | audit_firm |

### 授权书接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/authorizations` | 上传授权书 |
| GET | `/api/authorizations/:id` | 获取授权书详情 |
| PUT | `/api/authorizations/:id` | 更新授权书 |

### 健康检查
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 系统健康检查（含数据库验证） |
| GET | `/api/health/ready` | 服务就绪检查 |
| GET | `/api/health/info` | 系统信息 |

## 前后端协同设计

### 统一响应格式
```json
{
  "success": true,
  "message": "操作成功",
  "data": {},
  "error": "错误码（可选）"
}
```

### 特定错误码
| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| `NO_AUTHORIZATION` | 授权书缺失 | 前端显示详细错误弹窗，引导上传授权书 |
| `AUTHORIZATION_INVALID` | 授权书无效 | 提示授权书已过期或已失效 |

### 前端错误处理
前端三个关键页面均实现了授权书缺失错误处理：
- [AuditFirmDashboard.jsx](file:///Users/mingyuan/workspace/sihuo/wangxtw3/855/client/src/pages/roles/AuditFirmDashboard.jsx) - 工作台提交
- [ConfirmationDetailPage.jsx](file:///Users/mingyuan/workspace/sihuo/wangxtw3/855/client/src/pages/ConfirmationDetailPage.jsx) - 详情页提交
- [ConfirmationCreatePage.jsx](file:///Users/mingyuan/workspace/sihuo/wangxtw3/855/client/src/pages/ConfirmationCreatePage.jsx) - 创建页提交

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 会计师事务所 | audit_firm | 123456 |
| 银行经办 | bank_clerk | 123456 |
| 复核经理 | review_manager | 123456 |
| 审计客户 | audit_client | 123456 |

## 项目结构

```
.
├── client/                      # 前端 React 应用
│   ├── src/
│   │   ├── components/          # 公共组件
│   │   │   ├── Layout.jsx       # 主布局（角色差异化菜单）
│   │   │   ├── StatusStepper.jsx # 状态进度条
│   │   │   └── ConfirmationTable.jsx # 询证函表格
│   │   ├── pages/               # 页面组件
│   │   │   ├── roles/           # 各角色工作台
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ConfirmationListPage.jsx
│   │   │   ├── ConfirmationDetailPage.jsx
│   │   │   └── ConfirmationCreatePage.jsx
│   │   ├── services/            # API 服务
│   │   │   └── api.js           # Axios 实例 + 各模块 API
│   │   ├── contexts/            # React Context
│   │   │   └── AuthContext.jsx  # 认证上下文
│   │   └── utils/               # 工具函数
│   ├── index.html
│   ├── vite.config.js           # Vite 配置（代理 /api 到后端）
│   └── package.json
├── server/                      # 后端 Node.js 服务
│   ├── src/
│   │   ├── models/              # 数据模型
│   │   │   ├── ConfirmationModel.js
│   │   │   ├── AuthorizationModel.js
│   │   │   ├── AccountDetailModel.js
│   │   │   ├── ReplyOpinionModel.js
│   │   │   └── StampRecordModel.js
│   │   ├── routes/              # API 路由
│   │   ├── middleware/          # 中间件（认证、权限）
│   │   ├── controllers/         # 业务逻辑控制器
│   │   ├── utils/               # 工具函数
│   │   │   └── db.js            # 数据库单例连接
│   │   ├── scripts/
│   │   │   └── initDB.js        # 数据库初始化脚本
│   │   └── index.js             # 服务入口
│   └── package.json
├── scripts/                     # 脚本
│   ├── smoke-test.js            # Smoke 自动化测试
│   ├── smoke.sh                 # macOS/Linux 入口
│   └── smoke.ps1                # Windows 入口
├── README.md
└── package.json
```

## NPM 脚本说明

| 命令 | 说明 |
|------|------|
| `npm run install:all` | 安装所有依赖（根目录+后端+前端） |
| `npm run install:server` | 仅安装后端依赖 |
| `npm run install:client` | 仅安装前端依赖 |
| `npm run dev` | 同时启动后端和前端开发服务 |
| `npm run dev:server` | 仅启动后端开发服务 |
| `npm run dev:client` | 仅启动前端开发服务 |
| `npm run init:db` | 初始化数据库 |
| `npm run smoke` | 运行 Smoke 自动化测试 |
| `npm run build` | 构建前端生产版本 |
| `npm start` | 启动后端生产服务 |

## 验证结果

✅ **Smoke 测试全部通过** (18/18 项检查通过)

验证结论：
- 后端 API 正确拦截了缺授权书的提交请求，返回 `NO_AUTHORIZATION` 错误码
- 错误消息明确包含"授权书缺失，不得受理"业务提示
- 前端相关页面均实现了对应错误的处理逻辑，会向用户显示友好提示
- 健康检查正常，数据库连接良好
- 完整业务流程符合"授权书缺失不得受理"的业务规则
