const Joi = require('joi');
const ConfirmationModel = require('../models/ConfirmationModel');
const AuthorizationModel = require('../models/AuthorizationModel');
const AccountDetailModel = require('../models/AccountDetailModel');
const ReplyOpinionModel = require('../models/ReplyOpinionModel');
const StampRecordModel = require('../models/StampRecordModel');
const { all } = require('../utils/db');

class ConfirmationController {
  static createSchema = Joi.object({
    firm_id: Joi.number().integer().required(),
    client_id: Joi.number().integer().required(),
    bank_id: Joi.number().integer().required(),
    account_id: Joi.number().integer().required(),
    audit_period: Joi.string().required(),
    confirmation_type: Joi.string().valid('balance', 'transaction', 'other').default('balance'),
    content: Joi.string().required(),
    has_authorization: Joi.boolean().default(false),
    remarks: Joi.string().allow('').default('')
  });

  static async create(req, res) {
    try {
      const { error, value } = ConfirmationController.createSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await ConfirmationModel.create(value, req.user.id);

      res.status(201).json({
        success: true,
        message: '询证函创建成功',
        data: result
      });
    } catch (err) {
      console.error('创建询证函失败:', err);
      res.status(500).json({
        success: false,
        message: '创建询证函失败，请稍后重试'
      });
    }
  }

  static async submit(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const confirmation = await ConfirmationModel.findById(id);
      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: '询证函不存在'
        });
      }

      if (confirmation.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: '只能提交草稿状态的询证函'
        });
      }

      if (!confirmation.has_authorization) {
        return res.status(400).json({
          success: false,
          message: '授权书缺失，不得受理，请先上传授权书',
          error: 'NO_AUTHORIZATION'
        });
      }

      const authCheck = await ConfirmationModel.checkAuthorization(id);
      if (!authCheck.authorized) {
        return res.status(400).json({
          success: false,
          message: authCheck.reason,
          error: 'AUTHORIZATION_INVALID'
        });
      }

      await ConfirmationModel.updateStatus(id, 'submitted', userId, '提交询证函');
      await ConfirmationModel.updateStatus(id, 'authorization_pending', userId, '待授权审核');

      const updated = await ConfirmationModel.findById(id);

      res.json({
        success: true,
        message: '询证函提交成功，等待授权审核',
        data: updated
      });
    } catch (err) {
      console.error('提交询证函失败:', err);
      res.status(500).json({
        success: false,
        message: err.message || '提交询证函失败，请稍后重试'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const confirmation = await ConfirmationModel.findById(id);

      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: '询证函不存在'
        });
      }

      const [authorizations, accountDetails, replyOpinions, stampRecords, logs] = await Promise.all([
        AuthorizationModel.findByConfirmationId(id),
        AccountDetailModel.findByConfirmationId(id),
        ReplyOpinionModel.findByConfirmationId(id),
        StampRecordModel.findByConfirmationId(id),
        ConfirmationModel.getLogs(id)
      ]);

      res.json({
        success: true,
        data: {
          ...confirmation,
          authorizations,
          account_details: accountDetails,
          reply_opinions: replyOpinions,
          stamp_records: stampRecords,
          logs
        }
      });
    } catch (err) {
      console.error('获取询证函详情失败:', err);
      res.status(500).json({
        success: false,
        message: '获取询证函详情失败'
      });
    }
  }

  static async list(req, res) {
    try {
      const filters = {};
      const user = req.user;

      if (user.role === 'audit_firm') {
        filters.firm_id = user.id;
      } else if (user.role === 'audit_client') {
        filters.client_id = 1;
      }

      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.has_authorization !== undefined) {
        filters.has_authorization = req.query.has_authorization === 'true';
      }

      const confirmations = await ConfirmationModel.findAll(filters);

      res.json({
        success: true,
        data: confirmations
      });
    } catch (err) {
      console.error('获取询证函列表失败:', err);
      res.status(500).json({
        success: false,
        message: '获取询证函列表失败'
      });
    }
  }

  static async checkAuthorization(req, res) {
    try {
      const { id } = req.params;
      const result = await ConfirmationModel.checkAuthorization(id);

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      console.error('检查授权状态失败:', err);
      res.status(500).json({
        success: false,
        message: '检查授权状态失败'
      });
    }
  }

  static async process(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const confirmation = await ConfirmationModel.findById(id);
      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: '询证函不存在'
        });
      }

      if (confirmation.status !== 'authorization_pending') {
        return res.status(400).json({
          success: false,
          message: '只能处理待授权审核状态的询证函'
        });
      }

      await ConfirmationModel.updateStatus(id, 'processing', userId, '开始处理');

      const updated = await ConfirmationModel.findById(id);

      res.json({
        success: true,
        message: '已开始处理询证函',
        data: updated
      });
    } catch (err) {
      console.error('处理询证函失败:', err);
      res.status(500).json({
        success: false,
        message: '处理询证函失败'
      });
    }
  }

  static async finishProcessing(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const confirmation = await ConfirmationModel.findById(id);
      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: '询证函不存在'
        });
      }

      if (confirmation.status !== 'processing') {
        return res.status(400).json({
          success: false,
          message: '只能完成处理中状态的询证函'
        });
      }

      await ConfirmationModel.updateStatus(id, 'processed', userId, '处理完成');
      await ConfirmationModel.updateStatus(id, 'review_pending', userId, '待复核');

      const updated = await ConfirmationModel.findById(id);

      res.json({
        success: true,
        message: '处理完成，等待复核',
        data: updated
      });
    } catch (err) {
      console.error('完成处理失败:', err);
      res.status(500).json({
        success: false,
        message: '完成处理失败'
      });
    }
  }

  static async review(req, res) {
    try {
      const { id } = req.params;
      const { approved, opinion } = req.body;
      const userId = req.user.id;

      const confirmation = await ConfirmationModel.findById(id);
      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: '询证函不存在'
        });
      }

      if (confirmation.status !== 'review_pending') {
        return res.status(400).json({
          success: false,
          message: '只能复核待复核状态的询证函'
        });
      }

      if (approved) {
        await ConfirmationModel.updateStatus(id, 'stamped', userId, opinion || '复核通过');
      } else {
        await ConfirmationModel.updateStatus(id, 'review_rejected', userId, opinion || '复核不通过');
      }

      const updated = await ConfirmationModel.findById(id);

      res.json({
        success: true,
        message: approved ? '复核通过' : '复核不通过',
        data: updated
      });
    } catch (err) {
      console.error('复核失败:', err);
      res.status(500).json({
        success: false,
        message: '复核失败'
      });
    }
  }

  static async archive(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const confirmation = await ConfirmationModel.findById(id);
      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: '询证函不存在'
        });
      }

      if (confirmation.status !== 'stamped') {
        return res.status(400).json({
          success: false,
          message: '只能归档已盖章状态的询证函'
        });
      }

      await ConfirmationModel.updateStatus(id, 'archived', userId, '已归档');

      const archiveNo = `ARC-${Date.now()}`;
      await all(
        'INSERT INTO archives (confirmation_id, archive_no, archived_by) VALUES (?, ?, ?)',
        [id, archiveNo, userId]
      );

      const updated = await ConfirmationModel.findById(id);

      res.json({
        success: true,
        message: '归档成功',
        data: { ...updated, archive_no: archiveNo }
      });
    } catch (err) {
      console.error('归档失败:', err);
      res.status(500).json({
        success: false,
        message: '归档失败'
      });
    }
  }

  static async getLogs(req, res) {
    try {
      const { id } = req.params;
      const logs = await ConfirmationModel.getLogs(id);

      res.json({
        success: true,
        data: logs
      });
    } catch (err) {
      console.error('获取操作日志失败:', err);
      res.status(500).json({
        success: false,
        message: '获取操作日志失败'
      });
    }
  }
}

module.exports = ConfirmationController;
