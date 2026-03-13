import { supabase } from '../config/supabaseClient';

export const createTodo = async (todoData: any) => {
    console.log('createTodo called with:', todoData);
    const { userId, task_name, has_reminder, reminder_date } = todoData;

    try {
        // First verify user exists in public.users
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            throw new Error(`User ${userId} not found in public.users table`);
        }

        const { data, error } = await supabase
            .from('todos')
            .insert([{
                user_id: userId,
                task_name,
                has_reminder,
                reminder_date: has_reminder ? reminder_date : null
            }])
            .select();

        console.log('Supabase response - data:', data);
        console.log('Supabase response - error:', error);

        if (error) {
            console.error('Supabase error details:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error('No data returned from database');
        }

        return data[0];
    } catch (err) {
        console.error('Error in createTodo:', err);
        throw err;
    }
};

export const getTodosByUserId = async (userId: string) => {
    console.log('getTodosByUserId called with:', userId);
    try {
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error in getTodosByUserId:', err);
        throw err;
    }
};

export const toggleCompletion = async (id: string) => {
    // 1. Fetch current state
    const { data: current, error: fetchError } = await supabase
        .from('todos')
        .select('is_completed')
        .eq('id', id)
        .single();

    if (fetchError) throw fetchError;

    // 2. Flip the boolean
    const { data, error } = await supabase
        .from('todos')
        .update({ is_completed: !current.is_completed })
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
};

export const updateTodo = async (id: string, updateData: any) => {
    const { data, error } = await supabase
        .from('todos')
        .update(updateData)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
};

export const deleteTodo = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) throw error;
    return true;
};