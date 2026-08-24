const express = require('express');
const router = express.Router();
const qcPlanController = require('../controllers/qcPlanController.cjs');

// Route definitions for QC Daily Planning
router.get('/daily', qcPlanController.getDailyPlans);
router.post('/generate', qcPlanController.generateDailyPlan);
router.put('/:planId', qcPlanController.updatePlan);
router.put('/:planId/reorder', qcPlanController.reorderPlanItems);
router.post('/:planId/items', qcPlanController.addPlanItem);
router.put('/:planId/items/:itemId/status', qcPlanController.updatePlanItemStatus);
router.put('/:planId/items/:itemId/check-in', qcPlanController.checkInPlanItem);
router.delete('/:planId/items/:itemId', qcPlanController.deletePlanItem);

module.exports = router;
