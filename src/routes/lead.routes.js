import express from 'express';
import leadController from '../controllers/lead.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Stats (before /:id to avoid conflict)
router.get('/stats', leadController.getLeadStats);

// CRUD
router.get('/',    leadController.getAllLeads);
router.get('/:id', leadController.getLeadById);
router.post('/',   leadController.createLead);

router.put('/:id',
  authorize(['super_admin', 'admin', 'manager', 'staff']),
  leadController.updateLead
);

// Status shortcut (PATCH)
router.patch('/:id/status',
  authorize(['super_admin', 'admin', 'manager', 'staff']),
  leadController.updateLeadStatus
);

// Activity log
router.post('/:id/activities',
  authorize(['super_admin', 'admin', 'manager', 'staff']),
  leadController.addActivity
);

router.delete('/:id',
  authorize(['super_admin', 'admin', 'manager']),
  leadController.deleteLead
);

export default router;
