const Joi = require('joi');
const AuthorizationModel = require('../models/AuthorizationModel');
const ConfirmationModel = require('../models/ConfirmationModel');

class AuthorizationController {
  static createSchema = Joi.object({
    confirmation_id: Joi.number().integer().required(),
    client_id: Joi.number().integer().required(),
    authorization_date: Joi.string().required(),
    authorization_content: Joi.string().required(),
    authorization_file: Joi.string().allow('').default(''),
    status: Joi.string().valid('valid', 'invalid', 'expired').default('valid')
  });

  static async create(req, res) {
    try {
      const { error, value } = AuthorizationController.createSchema.validate(req.body);
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

      const authId = await AuthorizationModel.create(value, req.user.id);

      await ConfirmationModel.updateHasAuthorization(value.confirmation_id, true, req.user.id);
      await ConfirmationModel.logAction(
        value.confirmation_id,
        'upload_authorization',
        confirmation.status,
        confirmation.status,
        req.user.id,
        '上传授权书'
      );

      const authorization = await AuthorizationModel.findById(authId);

      res.status(201).json({
        success: true,
        message: '授权书上传成功',
        data: authorization
      });
    } catch (err) {
      console.error('创建授权书失败:', err);
      res.status(500).json({
        success: false,
        message: '创建授权书失败'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const authorization = await AuthorizationModel.findById(id);

      if (!authorization) {
        return res.status(404).json({
          success: false,
          message: '授权书不存在'
        });
      }

      res.json({
        success: true,
        data: authorization
      });
    } catch (err) {
      console.error('获取授权书详情失败:', err);
      res.status(500).json({
        success: false,
        message: '获取授权书详情失败'
      });
    }
  }

  static async list(req, res) {
    try {
      const filters = {};

      if (req.query.confirmation_id) {
        filters.confirmation_id = parseInt(req.query.confirmation_id);
      }
      if (req.query.client_id) {
        filters.client_id = parseInt(req.query.client_id);
      }
      if (req.query.status) {
        filters.status = req.query.status;
      }

      const authorizations = await AuthorizationModel.findAll(filters);

      res.json({
        success: true,
        data: authorizations
      });
    } catch (err) {
      console.error('获取授权书列表失败:', err);
      res.status(500).json({
        success: false,
        message: '获取授权书列表失败'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const authorization = await AuthorizationModel.findById(id);
      if (!authorization) {
        return res.status(404).json({
          success: false,
          message: '授权书不存在'
        });
      }

      await AuthorizationModel.update(id, data);

      const updated = await AuthorizationModel.findById(id);

      res.json({
        success: true,
        message: '授权书更新成功',
        data: updated
      });
    } catch (err) {
      console.error('更新授权书失败:', err);
      res.status(500).json({
        success: false,
        message: '更新授权书失败'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const authorization = await AuthorizationModel.findById(id);
      if (!authorization) {
        return res.status(404).json({
          success: false,
          message: '授权书不存在'
        });
      }

      await AuthorizationModel.delete(id);

      const remainingAuths = await AuthorizationModel.findByConfirmationId(authorization.confirmation_id);
      if (remainingAuths.length === 0) {
        await ConfirmationModel.updateHasAuthorization(authorization.confirmation_id, false, req.user.id);
      }

      await ConfirmationModel.logAction(
        authorization.confirmation_id,
        'delete_authorization',
        null,
        null,
        req.user.id,
        '删除授权书'
      );

      res.json({
        success: true,
        message: '授权书删除成功'
      });
    } catch (err) {
      console.error('删除授权书失败:', err);
      res.status(500).json({
        success: false,
        message: '删除授权书失败'
      });
    }
  }
}

module.exports = AuthorizationController;
