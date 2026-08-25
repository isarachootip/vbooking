const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController.cjs');

// Customer CRUD
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

// Customer Sites CRUD
router.get('/:id/sites', customerController.getCustomerSites);
router.post('/:id/sites', customerController.createCustomerSite);
router.put('/sites/:siteId', customerController.updateCustomerSite);
router.delete('/sites/:siteId', customerController.deleteCustomerSite);

module.exports = router;
