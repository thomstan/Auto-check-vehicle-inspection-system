const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');

console.log("AdminController exports:", adminController);
// All routes here require a valid Admin Token
router.use(verifyToken, authorizeRole('admin'));

router.get('/stats', adminController.getStats);
router.get('/centers', adminController.getAllCenters);
router.post('/centers/add', adminController.createNewCenter);
router.get('/inspections/all', adminController.getGlobalInspections);
router.delete('/centers/:id', adminController.deleteCenter);
// Add this to adminRoutes.js
router.put('/centers/approve/:id', adminController.approvePayment);
//update centers data
router.put('/centers/:id', adminController.updateCenter); // Matches the new function

router.put('/centers/fee/:id', adminController.updateFee);
router.get('/centers/:id', adminController.getCenterProfile);

module.exports = router;