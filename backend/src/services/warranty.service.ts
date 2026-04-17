import { supabase } from '../config/supabaseClient';
import { scheduleWarrantyReminders, removeScheduledReminders } from './notificationQueue.service.js';

export const createWarranty = async (userId: string, data: any) => {
    const { data: result, error } = await supabase
        .from('warranties')
        .insert([{
            userId: userId,
            product_name: data.product_name,
            purchase_place: data.purchase_place,
            warranty_period: data.warranty_period,
            category: data.category,
            purchase_date: data.purchase_date,
            expiry_date: data.expiry_date,
            description: data.description,
            document_url: data.document_url,
            status: 'Active',
            reminder_schedule: data.reminder_schedule || null
        }])
        .select();

    if (error) throw error;

    if (result && result.length > 0) {
        try {
            await scheduleWarrantyReminders(
                userId,
                result[0].id,
                data.product_name,
                data.expiry_date,
                data.reminder_schedule
            );
        } catch (e) { console.error("Failed to schedule warranty reminders", e); }
    }
    return result;
};

export const updateWarranty = async (id: string, userId: string, data: any) => {
    const { data: result, error } = await supabase
        .from('warranties')
        .update({
            product_name: data.product_name,
            purchase_place: data.purchase_place,
            warranty_period: data.warranty_period,
            category: data.category,
            purchase_date: data.purchase_date,
            expiry_date: data.expiry_date,
            description: data.description,
            document_url: data.document_url,
            status: data.status,
            reminder_schedule: data.reminder_schedule || null
        })
        .eq('id', id)
        .eq('userId', userId)
        .select();

    if (error) throw error;

    if (result && result.length > 0) {
        try {
            await scheduleWarrantyReminders(
                userId,
                id,
                data.product_name,
                data.expiry_date,
                data.reminder_schedule
            );
        } catch (e) { console.error("Failed to update warranty reminder schedule", e); }
    }
    return result;
};

export const deleteWarranty = async (id: string, userId: string) => {
    const { error } = await supabase
        .from('warranties')
        .delete()
        .eq('id', id)
        .eq('userId', userId);

    if (error) throw error;
    await removeScheduledReminders(id);
    return true;
};

export const getWarrantiesByUserId = async (userId: string) => {
    const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('userId', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase Query Error:", error.message);
        throw new Error(error.message);
    }
    return data;
};

export const getWarrantyById = async (id: string, userId: string) => {
    const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('id', id)
        .eq('userId', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No rows returned - warranty not found
            return null;
        }
        throw error;
    }
    return data;
};

export const countDocumentsByUserId = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('warranties')
        .select('*', { count: 'exact', head: true })
        .eq('userId', userId)
        .not('document_url', 'is', null);

    if (error) throw error;
    return count || 0;
};
