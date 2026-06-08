const Joi = require('joi');
const TodoTaskModel = require('../models/TodoTaskModel');
const ConfirmationModel = require('../models/ConfirmationModel');

class TodoTaskController {
  static createSchema = Joi.object({
    task_type: Joi.string().valid('second_confirmation', 'review', 'authorization', 'stamp', 'archive').required(),
    task_title: Joi.string().required(),
    task_description: Joi.string().allow('').default(''),
    confirmation_id: Joi.number().integer().required(),
    assignee_role: Joi.string().valid('audit_firm', 'bank_clerk', 'review_manager', 'audit_client').required(),
    assignee_id: Joi.number().integer().allow(null),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    due_date: Joi.date().allow(null)
  });

  static async create(req, res) {
    try {
      const { error, value } = TodoTaskController.createSchema.validate(req.body);
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

      const result = await TodoTaskModel.create(value, req.user.id);

      res.status(201).json({
        success: true,
        message: '待办任务创建成功',
        data: result
      });
    } catch (err) {
      console.error('创建待办任务失败:', err);
      res.status(500).json({
        success: false,
        message: '创建待办任务失败，请稍后重试'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const task = await TodoTaskModel.findById(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: '待办任务不存在'
        });
      }

      res.json({
        success: true,
        data: task
      });
    } catch (err) {
      console.error('获取待办任务失败:', err);
      res.status(500).json({
        success: false,
        message: '获取待办任务失败'
      });
    }
  }

  static async list(req, res) {
    try {
      const filters = {};

      if (req.query.confirmation_id) {
        filters.confirmation_id = parseInt(req.query.confirmation_id);
      }
      if (req.query.task_type) {
        filters.task_type = req.query.task_type;
      }
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.assignee_role) {
        filters.assignee_role = req.query.assignee_role;
      }
      if (req.query.assignee_id) {
        filters.assignee_id = parseInt(req.query.assignee_id);
      }
      if (req.query.priority) {
        filters.priority = req.query.priority;
      }

      const tasks = await TodoTaskModel.findAll(filters);

      res.json({
        success: true,
        data: tasks
      });
    } catch (err) {
      console.error('获取待办任务列表失败:', err);
      res.status(500).json({
        success: false,
        message: '获取待办任务列表失败'
      });
    }
  }

  static async myTasks(req, res) {
    try {
      const filters = {};

      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.task_type) {
        filters.task_type = req.query.task_type;
      }
      if (req.query.priority) {
        filters.priority = req.query.priority;
      }

      const tasks = await TodoTaskModel.findMyTasks(req.user.id, req.user.role, filters);

      res.json({
        success: true,
        data: tasks
      });
    } catch (err) {
      console.error('获取我的待办任务失败:', err);
      res.status(500).json({
        success: false,
        message: '获取我的待办任务失败'
      });
    }
  }

  static async completeSecondConfirmation(req, res) {
    try {
      const { id } = req.params;
      const { approved, remark } = req.body;
      const userId = req.user.id;

      const task = await TodoTaskModel.findById(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: '待办任务不存在'
        });
      }

      if (task.task_type !== 'second_confirmation') {
        return res.status(400).json({
          success: false,
          message: '该任务不是二次确认任务'
        });
      }

      if (task.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '只能处理待处理的二次确认任务'
        });
      }

      const confirmation = await ConfirmationModel.findById(task.confirmation_id);
      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: '询证函不存在'
        });
      }

      if (confirmation.status !== 'second_confirm_pending') {
        return res.status(400).json({
          success: false,
          message: '询证函状态不是待二次确认，无法处理'
        });
      }

      if (approved) {
        await TodoTaskModel.complete(id, userId, remark || '二次确认通过');
        await ConfirmationModel.updateStatus(
          task.confirmation_id,
          'review_pending',
          userId,
          remark || '二次确认通过，提交复核'
        );
      } else {
        await TodoTaskModel.reject(id, userId, remark || '二次确认不通过');
        await ConfirmationModel.updateStatus(
          task.confirmation_id,
          'second_confirm_rejected',
          userId,
          remark || '二次确认不通过，退回重处理'
        );
      }

      const updatedTask = await TodoTaskModel.findById(id);
      const updatedConfirmation = await ConfirmationModel.findById(task.confirmation_id);

      res.json({
        success: true,
        message: approved ? '二次确认通过，已提交复核' : '二次确认不通过，已退回重处理',
        data: {
          task: updatedTask,
          confirmation: updatedConfirmation
        }
      });
    } catch (err) {
      console.error('处理二次确认失败:', err);
      res.status(500).json({
        success: false,
        message: err.message || '处理二次确认失败'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const task = await TodoTaskModel.findById(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: '待办任务不存在'
        });
      }

      await TodoTaskModel.delete(id);

      res.json({
        success: true,
        message: '待办任务删除成功'
      });
    } catch (err) {
      console.error('删除待办任务失败:', err);
      res.status(500).json({
        success: false,
        message: '删除待办任务失败'
      });
    }
  }

  static async getStats(req, res) {
    try {
      const userRole = req.user.role;
      const pendingCount = await TodoTaskModel.countPendingByRole(userRole);

      res.json({
        success: true,
        data: {
          pending_count: pendingCount,
          role: userRole
        }
      });
    } catch (err) {
      console.error('获取待办统计失败:', err);
      res.status(500).json({
        success: false,
        message: '获取待办统计失败'
      });
    }
  }
}

module.exports = TodoTaskController;
