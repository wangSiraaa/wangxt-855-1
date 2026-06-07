const Joi = require('joi');
const ReplyOpinionModel = require('../models/ReplyOpinionModel');
const ConfirmationModel = require('../models/ConfirmationModel');

class ReplyOpinionController {
  static createSchema = Joi.object({
    confirmation_id: Joi.number().integer().required(),
    opinion_type: Joi.string().valid('consistent', 'inconsistent', 'unable_to_confirm').required(),
    content: Joi.string().required(),
    difference_explanation: Joi.string().allow('').default(''),
    attachments: Joi.string().allow('').default('')
  });

  static async create(req, res) {
    try {
      const { error, value } = ReplyOpinionController.createSchema.validate(req.body);
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

      const opinionId = await ReplyOpinionModel.create(value, req.user.id);

      await ConfirmationModel.logAction(
        value.confirmation_id,
        'add_reply_opinion',
        confirmation.status,
        confirmation.status,
        req.user.id,
        `填写回函意见: ${value.opinion_type}`
      );

      const opinion = await ReplyOpinionModel.findById(opinionId);

      res.status(201).json({
        success: true,
        message: '回函意见提交成功',
        data: opinion
      });
    } catch (err) {
      console.error('提交回函意见失败:', err);
      res.status(500).json({
        success: false,
        message: '提交回函意见失败'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const opinion = await ReplyOpinionModel.findById(id);

      if (!opinion) {
        return res.status(404).json({
          success: false,
          message: '回函意见不存在'
        });
      }

      res.json({
        success: true,
        data: opinion
      });
    } catch (err) {
      console.error('获取回函意见失败:', err);
      res.status(500).json({
        success: false,
        message: '获取回函意见失败'
      });
    }
  }

  static async list(req, res) {
    try {
      const filters = {};

      if (req.query.confirmation_id) {
        filters.confirmation_id = parseInt(req.query.confirmation_id);
      }
      if (req.query.opinion_type) {
        filters.opinion_type = req.query.opinion_type;
      }
      if (req.query.review_status) {
        filters.review_status = req.query.review_status;
      }
      if (req.query.processed_by) {
        filters.processed_by = parseInt(req.query.processed_by);
      }

      const opinions = await ReplyOpinionModel.findAll(filters);

      res.json({
        success: true,
        data: opinions
      });
    } catch (err) {
      console.error('获取回函意见列表失败:', err);
      res.status(500).json({
        success: false,
        message: '获取回函意见列表失败'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const opinion = await ReplyOpinionModel.findById(id);
      if (!opinion) {
        return res.status(404).json({
          success: false,
          message: '回函意见不存在'
        });
      }

      await ReplyOpinionModel.update(id, data);

      const updated = await ReplyOpinionModel.findById(id);

      res.json({
        success: true,
        message: '回函意见更新成功',
        data: updated
      });
    } catch (err) {
      console.error('更新回函意见失败:', err);
      res.status(500).json({
        success: false,
        message: '更新回函意见失败'
      });
    }
  }

  static async review(req, res) {
    try {
      const { id } = req.params;
      const { review_status, review_opinion } = req.body;
      const userId = req.user.id;

      const opinion = await ReplyOpinionModel.findById(id);
      if (!opinion) {
        return res.status(404).json({
          success: false,
          message: '回函意见不存在'
        });
      }

      if (opinion.review_status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '只能复核待审核状态的回函意见'
        });
      }

      await ReplyOpinionModel.review(id, { review_status, review_opinion }, userId);

      await ConfirmationModel.logAction(
        opinion.confirmation_id,
        'review_reply_opinion',
        null,
        null,
        userId,
        `复核回函意见: ${review_status}`
      );

      const updated = await ReplyOpinionModel.findById(id);

      res.json({
        success: true,
        message: `复核${review_status === 'approved' ? '通过' : '不通过'}`,
        data: updated
      });
    } catch (err) {
      console.error('复核回函意见失败:', err);
      res.status(500).json({
        success: false,
        message: '复核回函意见失败'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const opinion = await ReplyOpinionModel.findById(id);
      if (!opinion) {
        return res.status(404).json({
          success: false,
          message: '回函意见不存在'
        });
      }

      await ReplyOpinionModel.delete(id);

      res.json({
        success: true,
        message: '回函意见删除成功'
      });
    } catch (err) {
      console.error('删除回函意见失败:', err);
      res.status(500).json({
        success: false,
        message: '删除回函意见失败'
      });
    }
  }
}

module.exports = ReplyOpinionController;
