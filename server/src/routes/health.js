const express = require('express');
const HealthController = require('../controllers/HealthController');

const router = express.Router();

router.get('/', HealthController.check);
router.get('/ready', HealthController.ready);
router.get('/info', HealthController.info);

module.exports = router;
