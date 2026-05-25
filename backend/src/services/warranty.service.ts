import { supabase } from '../config/supabaseClient.js';
import { scheduleWarrantyReminders, removeScheduledReminders } from './notificationQueue.service.js';
import { removeSharesForItem } from './sharing.service.js';

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
    await removeSharesForItem('warranty', id);
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

export const claimWarranty = async (id: string, userId: string) => {
    // 1. Update status to 'Claimed'
    const { data: result, error } = await supabase
        .from('warranties')
        .update({ status: 'Claimed' })
        .eq('id', id)
        .eq('userId', userId)
        .select()
        .single();

    if (error) throw error;
    if (!result) throw new Error('Warranty not found');

    // 2. Remove all pending scheduled reminders for this warranty
    await removeScheduledReminders(id);

    // 3. Insert an immediate in-app notification (scheduled_for = now)
    await supabase.from('scheduled_notifications').insert({
        user_id: userId,
        reference_id: id,
        reference_type: 'warranty',
        title: `Warranty Claimed: ${result.product_name}`,
        body: `You have successfully claimed the warranty for ${result.product_name}. No further reminders will be sent.`,
        scheduled_for: new Date().toISOString(),
        status: 'pending',
    });

    return result;
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
