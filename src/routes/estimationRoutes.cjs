const express = require('express');
const router = express.Router();
const estimationController = require('../controllers/estimationController.cjs');

// Contractors Master Routes
router.get('/contractors', estimationController.getContractors);
router.post('/contractors', estimationController.createContractor);
router.put('/contractors/:id', estimationController.updateContractor);
router.delete('/contractors/:id', estimationController.deleteContractor);

// Draft Estimations Routes
router.get('/', estimationController.getEstimations);
router.get('/:id', estimationController.getEstimationById);
router.post('/', estimationController.createEstimation);
router.put('/:id', estimationController.updateEstimation);
router.delete('/:id', estimationController.deleteEstimation);

// Contractor Bids & Selection
router.post('/:id/bids', estimationController.saveContractorBid);
router.delete('/:id/bids/:bidId', estimationController.deleteContractorBid);
router.post('/:id/apply-selection', estimationController.applyContractorSelection);

// 1-Click Convert to Quotation
router.post('/:id/convert-to-quotation', estimationController.convertToQuotation);

module.exports = router;
