import { supabase } from '../config/supabaseClient.js';
import { scheduleTodoReminder, removeScheduledReminders } from './notificationQueue.service.js';
import { removeSharesForItem } from './sharing.service.js';
import { normalizeReminderTime } from '../utils/timezone.js';

export const createTodo = async (todoData: any) => {
    console.log('createTodo called with:', todoData);
    const { userId, task_name, has_reminder, reminder_date, reminder_time } = todoData;
    const normalizedTime = has_reminder ? normalizeReminderTime(reminder_time) : null;

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
                reminder_date: has_reminder ? reminder_date : null,
                reminder_schedule: todoData.reminder_schedule,
                reminder_time: normalizedTime
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

        const todo = data[0];
        if (todo.has_reminder && todo.reminder_date) {
            try {
                await scheduleTodoReminder(
                    userId,
                    todo.id,
                    todo.task_name,
                    todo.reminder_date,
                    todo.reminder_schedule,
                    normalizedTime ?? undefined
                );
            } catch (e) {
                console.error("Failed to schedule todo reminder:", e);
            }
        }

        return todo;
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
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError) throw fetchError;

    const newIsCompleted = !current.is_completed;

    // 2. Flip the boolean
    const { data, error } = await supabase
        .from('todos')
        .update({ is_completed: newIsCompleted })
        .eq('id', id)
        .select();

    if (error) throw error;

    // 3. Handle Queue logic
    if (newIsCompleted) {
        await removeScheduledReminders(id);
    } else {
        if (current.has_reminder && current.reminder_date) {
            try {
                await scheduleTodoReminder(current.user_id, current.id, current.task_name, current.reminder_date, current.reminder_schedule, current.reminder_time);
            } catch (e) { console.error("Failed to reschedule todo reminder:", e); }
        }
    }

    return data[0];
};

export const updateTodo = async (id: string, updateData: any) => {
    const payload = { ...updateData };
    if ('reminder_time' in payload) {
        payload.reminder_time = payload.has_reminder === false
            ? null
            : normalizeReminderTime(payload.reminder_time);
    }

    const { data, error } = await supabase
        .from('todos')
        .update(payload)
        .eq('id', id)
        .select();

    if (error) throw error;
    
    const updated = data[0];
    if (updated) {
        if (updated.has_reminder && updated.reminder_date && !updated.is_completed) {
            try {
                await scheduleTodoReminder(updated.user_id, updated.id, updated.task_name, updated.reminder_date, updated.reminder_schedule, updated.reminder_time);
            } catch (e) { console.error("Failed to update todo schedule", e); }
        } else {
            await removeScheduledReminders(id);
        }
    }
    return updated;
};

export const deleteTodo = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) throw error;
    await removeScheduledReminders(id);
    await removeSharesForItem('todo', id);
    return true;
};