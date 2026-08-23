const express = require('express');
const router = express.Router({ mergeParams: true });
const qcController = require('../controllers/qcHandoverController.cjs');

router.get('/', qcController.getProjectQC);
router.post('/inspection', qcController.createQCInspection);
router.post('/handover', qcController.submitHandover);

module.exports = router;
