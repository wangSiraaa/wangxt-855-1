const express = require('express');
const AuthorizationController = require('../controllers/AuthorizationController');
const { authenticateToken, requireRole, attachUser } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, attachUser);

router.post(
  '/',
  requireRole('audit_client', 'audit_firm'),
  AuthorizationController.create
);

router.get('/', AuthorizationController.list);

router.get('/:id', AuthorizationController.getById);

router.put(
  '/:id',
  requireRole('audit_client', 'audit_firm'),
  AuthorizationController.update
);

router.delete(
  '/:id',
  requireRole('audit_client', 'audit_firm'),
  AuthorizationController.delete
);

module.exports = router;
