import { Router } from 'express';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { adminLogin, listUsers, getStats, getUserDetail, deleteUser } from '../controllers/admin.controller.js';

const router = Router();

// Public: separate admin login (independent of user auth).
router.post('/login', asyncHandler(adminLogin));

// Everything below requires a valid admin-scoped token.
router.use(requireAdmin);

router.get('/stats', asyncHandler(getStats));
router.get('/users', asyncHandler(listUsers));
router.get('/users/:id', asyncHandler(getUserDetail));
router.delete('/users/:id', asyncHandler(deleteUser));

export default router;
