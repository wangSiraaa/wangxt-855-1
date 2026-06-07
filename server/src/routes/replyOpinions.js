const express = require('express');
const ReplyOpinionController = require('../controllers/ReplyOpinionController');
const { authenticateToken, requireRole, attachUser } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, attachUser);

router.post(
  '/',
  requireRole('bank_clerk'),
  ReplyOpinionController.create
);

router.get('/', ReplyOpinionController.list);

router.get('/:id', ReplyOpinionController.getById);

router.put(
  '/:id',
  requireRole('bank_clerk'),
  ReplyOpinionController.update
);

router.post(
  '/:id/review',
  requireRole('review_manager'),
  ReplyOpinionController.review
);

router.delete(
  '/:id',
  requireRole('bank_clerk'),
  ReplyOpinionController.delete
);

module.exports = router;
