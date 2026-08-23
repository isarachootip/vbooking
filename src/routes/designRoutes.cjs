const express = require('express');
const router = express.Router({ mergeParams: true });
const designController = require('../controllers/designController.cjs');

router.get('/', designController.getLeadDesigns);
router.post('/', designController.createDesign);
router.put('/:designId/status', designController.updateDesignStatus);

module.exports = router;
