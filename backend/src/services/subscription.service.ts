import { supabase } from '../config/supabaseClient';
import { scheduleSubscriptionReminders, removeScheduledReminders, getNextOccurrence } from './notificationQueue.service.js';

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

  const augmentedData = data.map(item => {
    const nextDate = getNextOccurrence(item.start_date, item.billing_cycle);
    item.next_billing_date = nextDate.toISOString();
       
    const now = new Date();
    now.setHours(0,0,0,0);
    const dateComp = new Date(nextDate);
    dateComp.setHours(0,0,0,0);
    
    const diffTime = dateComp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
       
    if (diffDays < 0) {
      item.status = 'Overdue';
    } else if (diffDays <= 3) {
      item.status = 'Due Soon';
    } else {
      item.status = 'Active';
    }
    return item;
  });
     
  augmentedData.sort((a,b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime());
  return augmentedData;
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

// Renew a subscription by advancing the start date
export const renewSubscription = async (id: string, userId: string) => {
  const { data: current, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .eq('userId', userId)
    .single();
    
  if (fetchErr) throw fetchErr;

  const nextDate = getNextOccurrence(current.start_date, current.billing_cycle);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ start_date: nextDate.toISOString().split('T')[0], status: 'Active' })
    .eq('id', id)
    .select();
    
  if (error) throw error;
  
  if (data && data.length > 0) {
    try {
      await scheduleSubscriptionReminders(
        userId, 
        id, 
        data[0].service_name, 
        data[0].start_date, 
        data[0].billing_cycle, 
        data[0].reminder_schedule
      );
    } catch(e) { console.error("Failed to reschedule renewed subscription:", e); }
  }
  return data[0];
};