const express = require('express');
const AccountDetailController = require('../controllers/AccountDetailController');
const { authenticateToken, requireRole, attachUser } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, attachUser);

router.post(
  '/',
  requireRole('bank_clerk'),
  AccountDetailController.create
);

router.get('/', AccountDetailController.list);

router.get('/:id', AccountDetailController.getById);

router.put(
  '/:id',
  requireRole('bank_clerk'),
  AccountDetailController.update
);

router.delete(
  '/:id',
  requireRole('bank_clerk'),
  AccountDetailController.delete
);

module.exports = router;
