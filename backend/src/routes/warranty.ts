import { Router } from 'express';
import * as warrantyController from '../controllers/warranty.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import multer from 'multer';

const router = Router();

// Using memoryStorage to keep the file in RAM temporarily
const upload = multer({ storage: multer.memoryStorage() });

router.post('/add', protect, upload.single('document'), warrantyController.addWarranty);
router.get('/user/:userId', protect, warrantyController.getUserWarranties);
router.get('/:id', protect, warrantyController.getWarranty);
router.put('/:id', protect, upload.single('document'), warrantyController.editWarranty);
router.delete('/:id', protect, warrantyController.removeWarranty);
router.patch('/:id/claim', protect, warrantyController.claimWarranty);

export default router;