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