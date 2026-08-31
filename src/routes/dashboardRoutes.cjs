const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController.cjs');

router.get('/summary', dashboardController.getDashboardSummary);
router.get('/pipeline-performance', dashboardController.getPipelinePerformance);

module.exports = router;

