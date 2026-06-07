const express = require('express');
const StampRecordController = require('../controllers/StampRecordController');
const { authenticateToken, requireRole, attachUser } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, attachUser);

router.post(
  '/',
  requireRole('review_manager'),
  StampRecordController.create
);

router.get('/', StampRecordController.list);

router.get('/:id', StampRecordController.getById);

router.put(
  '/:id',
  requireRole('review_manager'),
  StampRecordController.update
);

router.delete(
  '/:id',
  requireRole('review_manager'),
  StampRecordController.delete
);

router.get('/verify/:signature', StampRecordController.verifySignature);

module.exports = router;
