const Joi = require('joi');
const AccountDetailModel = require('../models/AccountDetailModel');
const ConfirmationModel = require('../models/ConfirmationModel');

class AccountDetailController {
  static createSchema = Joi.object({
    confirmation_id: Joi.number().integer().required(),
    account_id: Joi.number().integer().required(),
    balance_date: Joi.string().required(),
    balance_amount: Joi.number().required(),
    currency: Joi.string().default('CNY'),
    transaction_count: Joi.number().integer().default(0),
    transaction_amount: Joi.number().default(0),
    account_status: Joi.string().default('normal'),
    interest_rate: Joi.number().default(0),
    overdraft_limit: Joi.number().default(0),
    remarks: Joi.string().allow('').default('')
  });

  static async create(req, res) {
    try {
      const { error, value } = AccountDetailController.createSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const confirmation = await ConfirmationModel.findById(value.confirmation_id);
      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: '询证函不存在'
        });
      }

      const detailId = await AccountDetailModel.create(value, req.user.id);

      await ConfirmationModel.logAction(
        value.confirmation_id,
        'add_account_detail',
        confirmation.status,
        confirmation.status,
        req.user.id,
        '录入账户明细'
      );

      const detail = await AccountDetailModel.findById(detailId);

      res.status(201).json({
        success: true,
        message: '账户明细录入成功',
        data: detail
      });
    } catch (err) {
      console.error('录入账户明细失败:', err);
      res.status(500).json({
        success: false,
        message: '录入账户明细失败'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const detail = await AccountDetailModel.findById(id);

      if (!detail) {
        return res.status(404).json({
          success: false,
          message: '账户明细不存在'
        });
      }

      res.json({
        success: true,
        data: detail
      });
    } catch (err) {
      console.error('获取账户明细失败:', err);
      res.status(500).json({
        success: false,
        message: '获取账户明细失败'
      });
    }
  }

  static async list(req, res) {
    try {
      const filters = {};

      if (req.query.confirmation_id) {
        filters.confirmation_id = parseInt(req.query.confirmation_id);
      }
      if (req.query.account_id) {
        filters.account_id = parseInt(req.query.account_id);
      }
      if (req.query.balance_date) {
        filters.balance_date = req.query.balance_date;
      }

      const details = await AccountDetailModel.findAll(filters);

      res.json({
        success: true,
        data: details
      });
    } catch (err) {
      console.error('获取账户明细列表失败:', err);
      res.status(500).json({
        success: false,
        message: '获取账户明细列表失败'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const detail = await AccountDetailModel.findById(id);
      if (!detail) {
        return res.status(404).json({
          success: false,
          message: '账户明细不存在'
        });
      }

      await AccountDetailModel.update(id, data);

      const updated = await AccountDetailModel.findById(id);

      res.json({
        success: true,
        message: '账户明细更新成功',
        data: updated
      });
    } catch (err) {
      console.error('更新账户明细失败:', err);
      res.status(500).json({
        success: false,
        message: '更新账户明细失败'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const detail = await AccountDetailModel.findById(id);
      if (!detail) {
        return res.status(404).json({
          success: false,
          message: '账户明细不存在'
        });
      }

      await AccountDetailModel.delete(id);

      res.json({
        success: true,
        message: '账户明细删除成功'
      });
    } catch (err) {
      console.error('删除账户明细失败:', err);
      res.status(500).json({
        success: false,
        message: '删除账户明细失败'
      });
    }
  }
}

module.exports = AccountDetailController;
