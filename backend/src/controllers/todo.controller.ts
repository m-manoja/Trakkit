import { Request, Response } from 'express';
import * as todoService from '../services/todo.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

// Todo controller for handling CRUD operations

export const addTodo = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Request body:', req.body);
        console.log('User from token:', req.user);

        const { task_name, has_reminder, reminder_date } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!task_name) {
            return res.status(400).json({ success: false, message: "Task name is required" });
        }

        const todoData = {
            userId,
            task_name,
            has_reminder: has_reminder || false,
            reminder_date: has_reminder ? reminder_date : null
        };

        console.log('Creating todo with data:', todoData);
        const todo = await todoService.createTodo(todoData);
        res.status(201).json({ success: true, data: todo });
    } catch (error: any) {
        console.error('Error in addTodo:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTodos = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        console.log('Getting todos for user:', userId);

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }
        const todos = await todoService.getTodosByUserId(userId);
        res.status(200).json({ success: true, data: todos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleTodoStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "Todo ID is required" });
        }
        const updated = await todoService.toggleCompletion(id);
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateTodo = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "Todo ID is required" });
        }
        const updated = await todoService.updateTodo(id, req.body);
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteTodo = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "Todo ID is required" });
        }
        await todoService.deleteTodo(id);
        res.status(200).json({ success: true, message: "Task removed" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};