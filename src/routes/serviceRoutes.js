const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

router.get('/', serviceController.getPricebook);
router.post('/', serviceController.addPriceItem);
router.put('/:id', serviceController.updatePriceItem);
router.delete('/:id', serviceController.deletePriceItem);

module.exports = router;
