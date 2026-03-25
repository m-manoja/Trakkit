import { supabase } from '../config/supabaseClient';
import { scheduleManualReminder, removeScheduledReminders } from './notificationQueue.service.js';

export const createReminder = async (reminderData: any) => {
    const { data, error } = await supabase
        .from('manual_reminders')
        .insert([reminderData])
        .select();

    if (error) throw error;
    
    if (data && data.length > 0) {
        try {
            await scheduleManualReminder(
                reminderData.user_id, 
                data[0].id, 
                data[0].title, 
                data[0].reminder_date,
                data[0].remind_time,
                data[0].reminder_schedule
            );
        } catch(e) { console.error("Failed to schedule reminder:", e); }
    }
    return data[0];
};

export const getRemindersByUserId = async (userId: string) => {
    const { data, error } = await supabase
        .from('manual_reminders')
        .select('*')
        .eq('user_id', userId)
        .order('reminder_date', { ascending: true });

    if (error) throw error;
    return data;
};

export const updateReminder = async (id: string, reminderData: any) => {
    const { data, error } = await supabase
        .from('manual_reminders')
        .update(reminderData)
        .eq('id', id)
        .select();

    if (error) throw error;
    
    if (data && data.length > 0) {
        try {
            await scheduleManualReminder(
                data[0].user_id, 
                id, 
                data[0].title, 
                data[0].reminder_date,
                data[0].remind_time,
                data[0].reminder_schedule
            );
        } catch(e) { console.error("Failed to restructure reminder:", e); }
    }
    return data[0];
};

export const deleteReminderById = async (id: string) => {
    const { error } = await supabase.from('manual_reminders').delete().eq('id', id);
    if (error) throw error;
    await removeScheduledReminders(id);
    return true;
};