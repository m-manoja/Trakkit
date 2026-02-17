import { Router } from 'express';
import * as warrantyController from '../controllers/warranty.controller';
import { protect } from '../middlewares/auth.middleware';
import multer from 'multer';

const router = Router();

// Using memoryStorage to keep the file in RAM temporarily
const upload = multer({ storage: multer.memoryStorage() });

router.post('/add', protect, upload.single('document'), warrantyController.addWarranty);
router.get('/user/:userId', protect, warrantyController.getUserWarranties);
router.put('/:id', protect, upload.single('document'), warrantyController.editWarranty);
router.delete('/:id', protect, warrantyController.removeWarranty);

export default router;