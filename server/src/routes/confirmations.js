const express = require('express');
const ConfirmationController = require('../controllers/ConfirmationController');
const { authenticateToken, requireRole, attachUser } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, attachUser);

router.post(
  '/',
  requireRole('audit_firm'),
  ConfirmationController.create
);

router.get('/', ConfirmationController.list);

router.get('/:id', ConfirmationController.getById);

router.post(
  '/:id/submit',
  requireRole('audit_firm'),
  ConfirmationController.submit
);

router.get('/:id/authorization', ConfirmationController.checkAuthorization);

router.post(
  '/:id/process',
  requireRole('bank_clerk'),
  ConfirmationController.process
);

router.post(
  '/:id/finish',
  requireRole('bank_clerk'),
  ConfirmationController.finishProcessing
);

router.post(
  '/:id/review',
  requireRole('review_manager'),
  ConfirmationController.review
);

router.post(
  '/:id/archive',
  requireRole('audit_firm'),
  ConfirmationController.archive
);

router.get('/:id/logs', ConfirmationController.getLogs);

module.exports = router;
