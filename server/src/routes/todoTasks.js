const express = require('express');
const TodoTaskController = require('../controllers/TodoTaskController');
const { authenticateToken, requireRole, attachUser } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, attachUser);

router.post(
  '/',
  TodoTaskController.create
);

router.get('/', TodoTaskController.list);

router.get('/my', TodoTaskController.myTasks);

router.get('/stats', TodoTaskController.getStats);

router.get('/:id', TodoTaskController.getById);

router.post(
  '/:id/second-confirm',
  requireRole('review_manager'),
  TodoTaskController.completeSecondConfirmation
);

router.delete('/:id', TodoTaskController.delete);

module.exports = router;
