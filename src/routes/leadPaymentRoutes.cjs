const express = require('express');
const router = express.Router({ mergeParams: true });
const paymentController = require('../controllers/leadPaymentController.cjs');

router.get('/', paymentController.getLeadPayments);
router.post('/', paymentController.createLeadPayment);

module.exports = router;
