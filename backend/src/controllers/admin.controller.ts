import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import * as adminService from '../services/admin.service.js';
import { ADMIN_SCOPE, verifyAdminCredentials } from '../utils/admin.js';

export async function adminLogin(req: Request, res: Response) {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  if (!verifyAdminCredentials(username, password)) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  }

  const token = jwt.sign({ scope: ADMIN_SCOPE, sub: username }, config.jwt.secret, {
    expiresIn: '12h',
  });

  return res.json({ success: true, token });
}

export async function listUsers(req: Request, res: Response) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;

    const result = await adminService.listUsers({ search, page, pageSize });
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getStats(_req: Request, res: Response) {
  try {
    const stats = await adminService.getUserStats();
    return res.json({ success: true, data: stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getUserDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'User ID is required' });
    const detail = await adminService.getUserDetail(id);
    return res.json({ success: true, data: detail });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'User ID is required' });

    await adminService.deleteUser(id);
    return res.json({ success: true, message: 'User deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
