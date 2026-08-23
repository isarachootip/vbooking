const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController.cjs');

router.get('/site-visits', leadController.getSiteVisitApprovals);
router.put('/:id/site-visit-approval', leadController.approveSiteVisit);
router.get('/', leadController.getLeads);
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.get('/:id/followups', leadController.getFollowups);
router.post('/:id/followups', leadController.addFollowup);
// Visit Results
router.get('/:id/visit-results', leadController.getVisitResults);
router.post('/:id/visit-results', leadController.addVisitResult);
router.put('/:id/visit-results/:resultId', leadController.updateVisitResult);
// router.post('/:id/convert', leadController.convertLead); // Moving this later since it's complex

module.exports = router;
