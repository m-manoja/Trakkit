import { supabase } from '../config/supabaseClient';

export const createReminder = async (reminderData: any) => {
    const { data, error } = await supabase
        .from('manual_reminders')
        .insert([reminderData])
        .select();

    if (error) throw error;
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
    return data[0];
};

export const deleteReminderById = async (id: string) => {
    const { error } = await supabase.from('manual_reminders').delete().eq('id', id);
    if (error) throw error;
    return true;
};