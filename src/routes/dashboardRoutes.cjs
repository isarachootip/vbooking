const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController.cjs');

router.get('/summary', dashboardController.getDashboardSummary);

module.exports = router;
