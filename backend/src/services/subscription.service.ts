import { supabase } from '../config/supabaseClient';
import { scheduleSubscriptionReminders, removeScheduledReminders } from './notificationQueue.service.js';

export const createSubscription = async (userId: string, data: any) => {
  const {
    service_name,
    amount,
    billing_cycle,
    category,
    start_date,
    description
  } = data;

  const { data: result, error } = await supabase
    .from('subscriptions')
    .insert([
      {
        userId: userId,
        service_name,
        amount: parseFloat(amount),
        billing_cycle,
        category,
        start_date,
        description,
        status: 'Active',
        reminder_schedule: data.reminder_schedule || null
      }
    ])
    .select();

  if (error) {
    console.error("Supabase Insert Error:", error.message);
    throw new Error(error.message);
  }

  if (result && result.length > 0) {
    try {
      await scheduleSubscriptionReminders(
        userId, 
        result[0].id, 
        service_name, 
        start_date, 
        billing_cycle, 
        data.reminder_schedule
      );
    } catch(e) { console.error("Failed to schedule reminders:", e); }
  }

  return result;
};

export const getSubscriptionsByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('userId', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Update an existing subscription
export const updateSubscription = async (id: string, userId: string, updateData: any) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      service_name: updateData.service_name,
      amount: parseFloat(updateData.amount),
      billing_cycle: updateData.billing_cycle,
      category: updateData.category,
      start_date: updateData.start_date,
      description: updateData.description,
      status: updateData.status,
      reminder_schedule: updateData.reminder_schedule || null
    })
    .eq('id', id)
    .eq('userId', userId)
    .select();

  if (error) throw error;
  if (data && data.length > 0) {
    try {
      await scheduleSubscriptionReminders(
        userId, 
        id, 
        updateData.service_name, 
        updateData.start_date, 
        updateData.billing_cycle, 
        updateData.reminder_schedule
      );
    } catch (e) { console.error("Failed to update schedule:", e); }
  }

  return data;
};

// Delete a subscription
export const deleteSubscription = async (id: string, userId: string) => {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('userId', userId);

  if (error) throw error;
  if (!error) {
    await removeScheduledReminders(id);
  }

  return true;
};