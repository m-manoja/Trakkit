import { Request, Response } from 'express';
import * as warrantyService from '../services/warranty.service';
import { supabase } from '../config/supabaseClient';

export const addWarranty = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id || (req as any).user.userId;
        const { product_name, purchase_place, warranty_period, category, purchase_date, description } = req.body;

        if (!product_name || !purchase_place) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        let document_url = null;

        if (req.file) {
            const fileName = `${userId}/${Date.now()}_${req.file.originalname}`;
            const { error: uploadError } = await supabase.storage
                .from('warranty-documents')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('warranty-documents')
                .getPublicUrl(fileName);

            document_url = urlData.publicUrl;
        }

        // Logic to calculate expiry date
        const purchase = new Date(purchase_date);
        const months = parseInt(warranty_period) || 0;
        const expiry = new Date(purchase.setMonth(purchase.getMonth() + months));

        const payload = {
            product_name,
            purchase_place,
            warranty_period,
            category,
            purchase_date,
            description,
            document_url,
            expiry_date: expiry.toISOString().split('T')[0],
            status: 'Active'
        };

        const data = await warrantyService.createWarranty(userId, payload);
        res.status(201).json({ success: true, data });
    } catch (error: any) {
        console.error("Add Controller Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const editWarranty = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'Warranty ID is required' });

        const userId = (req as any).user.id || (req as any).user.userId;

        // Fetch existing warranty to get current document_url for "Keep Both" logic
        const existingWarranty = await warrantyService.getWarrantyById(id, userId);
        if (!existingWarranty) return res.status(404).json({ success: false, message: 'Warranty not found' });

        let updateData = { ...req.body };

        // RECALCULATE EXPIRY DATE
        if (req.body.purchase_date || req.body.warranty_period) {
            const purchase = new Date(req.body.purchase_date || existingWarranty.purchase_date);
            const months = parseInt(req.body.warranty_period || existingWarranty.warranty_period) || 0;

            if (!isNaN(purchase.getTime())) {
                const expiry = new Date(purchase.setMonth(purchase.getMonth() + months));
                updateData.expiry_date = expiry.toISOString().split('T')[0];
            }
        }

        // HANDLE FILE UPLOAD (Replace vs Keep Both)
        if (req.file) {
            const fileName = `${userId}/${Date.now()}_${req.file.originalname}`;
            const { error: uploadError } = await supabase.storage
                .from('warranty-documents')
                .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('warranty-documents').getPublicUrl(fileName);
            const newFileUrl = urlData.publicUrl;

            // Check fileAction from frontend ('replace' or 'keep')
            const { fileAction } = req.body;

            if (fileAction === 'keep' && existingWarranty.document_url) {
                // Combine existing and new URLs with a comma
                updateData.document_url = `${existingWarranty.document_url},${newFileUrl}`;
            } else {
                // Replace with new URL
                updateData.document_url = newFileUrl;
            }
        }

        const data = await warrantyService.updateWarranty(id, userId, updateData);
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        console.error("Edit Controller Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserWarranties = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const data = await warrantyService.getWarrantiesByUserId(userId);
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const removeWarranty = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id || (req as any).user.userId;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Warranty ID is required'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        await warrantyService.deleteWarranty(id, userId);
        res.status(200).json({ success: true, message: "Warranty deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};