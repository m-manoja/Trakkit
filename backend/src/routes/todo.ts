import { Router } from 'express';
import { addTodo, getTodos, toggleTodoStatus, updateTodo, deleteTodo } from '../controllers/todo.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// Base path: /api/todos
router.get('/', protect, getTodos);
router.get('/user/:userId', protect, getTodos); // Keep old route for backward compatibility
router.post('/add', protect, addTodo);
router.put('/:id/toggle', protect, toggleTodoStatus);
router.put('/:id', protect, updateTodo);
router.delete('/:id', protect, deleteTodo);

export default router;