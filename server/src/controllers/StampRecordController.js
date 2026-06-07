const Joi = require('joi');
const StampRecordModel = require('../models/StampRecordModel');
const ConfirmationModel = require('../models/ConfirmationModel');
const ReplyOpinionModel = require('../models/ReplyOpinionModel');

class StampRecordController {
  static createSchema = Joi.object({
    confirmation_id: Joi.number().integer().required(),
    reply_id: Joi.number().integer().required(),
    stamp_type: Joi.string().valid('official', 'business', 'special').required(),
    stamp_location: Joi.string().default('北京'),
    stamp_image: Joi.string().allow('').default('')
  });

  static async create(req, res) {
    try {
      const { error, value } = StampRecordController.createSchema.validate(req.body);
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

      const reply = await ReplyOpinionModel.findById(value.reply_id);
      if (!reply) {
        return res.status(404).json({
          success: false,
          message: '回函意见不存在'
        });
      }

      if (reply.review_status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: '只能对已审核通过的回函意见进行盖章'
        });
      }

      const result = await StampRecordModel.create(value, req.user.id);

      await ConfirmationModel.logAction(
        value.confirmation_id,
        'stamp',
        confirmation.status,
        confirmation.status,
        req.user.id,
        `电子盖章: ${value.stamp_type}`
      );

      const record = await StampRecordModel.findById(result.id);

      res.status(201).json({
        success: true,
        message: '电子盖章成功',
        data: { ...record, digital_signature: result.digital_signature }
      });
    } catch (err) {
      console.error('电子盖章失败:', err);
      res.status(500).json({
        success: false,
        message: '电子盖章失败'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const record = await StampRecordModel.findById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: '盖章记录不存在'
        });
      }

      res.json({
        success: true,
        data: record
      });
    } catch (err) {
      console.error('获取盖章记录失败:', err);
      res.status(500).json({
        success: false,
        message: '获取盖章记录失败'
      });
    }
  }

  static async list(req, res) {
    try {
      const filters = {};

      if (req.query.confirmation_id) {
        filters.confirmation_id = parseInt(req.query.confirmation_id);
      }
      if (req.query.reply_id) {
        filters.reply_id = parseInt(req.query.reply_id);
      }
      if (req.query.stamp_type) {
        filters.stamp_type = req.query.stamp_type;
      }
      if (req.query.stamped_by) {
        filters.stamped_by = parseInt(req.query.stamped_by);
      }

      const records = await StampRecordModel.findAll(filters);

      res.json({
        success: true,
        data: records
      });
    } catch (err) {
      console.error('获取盖章记录列表失败:', err);
      res.status(500).json({
        success: false,
        message: '获取盖章记录列表失败'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const record = await StampRecordModel.findById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '盖章记录不存在'
        });
      }

      await StampRecordModel.update(id, data);

      const updated = await StampRecordModel.findById(id);

      res.json({
        success: true,
        message: '盖章记录更新成功',
        data: updated
      });
    } catch (err) {
      console.error('更新盖章记录失败:', err);
      res.status(500).json({
        success: false,
        message: '更新盖章记录失败'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const record = await StampRecordModel.findById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '盖章记录不存在'
        });
      }

      await StampRecordModel.delete(id);

      res.json({
        success: true,
        message: '盖章记录删除成功'
      });
    } catch (err) {
      console.error('删除盖章记录失败:', err);
      res.status(500).json({
        success: false,
        message: '删除盖章记录失败'
      });
    }
  }

  static async verifySignature(req, res) {
    try {
      const { signature } = req.params;
      const record = await StampRecordModel.verifySignature(signature);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: '签名无效'
        });
      }

      res.json({
        success: true,
        message: '签名验证通过',
        data: record
      });
    } catch (err) {
      console.error('验证签名失败:', err);
      res.status(500).json({
        success: false,
        message: '验证签名失败'
      });
    }
  }
}

module.exports = StampRecordController;
