import { supabase } from '../config/supabaseClient';

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
        // 1. CHANGE: Match your new database column name "userId"
        userId: userId, 
        service_name,
        amount: parseFloat(amount),
        billing_cycle,
        category,
        start_date,
        description,
        status: 'Active' // As you requested, default to Active
      }
    ])
    .select();

  if (error) {
    console.error("Supabase Insert Error:", error.message);
    throw new Error(error.message);
  }
  
  return result;
};

export const getSubscriptionsByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('userId', userId) // Matches your new database column name
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
      status: updateData.status
    })
    .eq('id', id)
    .eq('userId', userId) // Security: Ensure the user owns this record
    .select();

  if (error) throw error;
  return data;
};

// Delete a subscription
export const deleteSubscription = async (id: string, userId: string) => {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('userId', userId); // Security: Ensure the user owns this record

  if (error) throw error;
  return true;
};