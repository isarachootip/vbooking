const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');

router.post('/', quotationController.createQuotation);
router.get('/', quotationController.getQuotations);
router.get('/:id', quotationController.getQuotationById);
router.post('/:id/convert', quotationController.convertToProject);

module.exports = router;
