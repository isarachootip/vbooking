const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController.cjs');
const boqParserController = require('../controllers/boqParserController.cjs');
const leadPaymentController = require('../controllers/leadPaymentController.cjs');

router.get('/public/:id', quotationController.getPublicQuotation);
router.post('/public/:id/sign', quotationController.signPublicQuotation);
router.post('/scan-boq', boqParserController.scanBoq);
router.post('/import-boq-wbs/:projectId', boqParserController.importBoqToWbs);
router.post('/', quotationController.createQuotation);
router.get('/', quotationController.getQuotations);
router.get('/:id', quotationController.getQuotationById);
router.patch('/:id/status', quotationController.updateQuotationStatus);
router.delete('/:id', quotationController.deleteQuotation);
router.post('/:id/convert', quotationController.convertToProject);
router.get('/:id/payments', leadPaymentController.getQuotationPayments);
router.post('/:id/payments', leadPaymentController.createQuotationPayment);

module.exports = router;

