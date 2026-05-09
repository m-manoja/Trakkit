import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Trash2, 
  Loader2,
  CheckCircle,
  Circle
} from "lucide-react";
import Layout from "../../components/Layout";
import styles from "./TodosPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { 
  fetchTodos, 
  deleteTodo, 
  saveTodo, 
  toggleTodo,
  type Todo 
} from "../../api/todos";
import TodoFormModal from "./TodoFormModal";

export default function TodosPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadTodos = async () => {
    if (!user?.id || !user?.token) return;
    
    try {
      setLoading(true);
      const data = await fetchTodos(user.id, user.token);
      setTodos(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load tasks:", err);
      setError("Failed to load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, [user]);

  useEffect(() => {
    if (location.state?.openModal) {
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.token || !window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await deleteTodo(id, user.token);
      loadTodos();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete task");
    }
  };

  const handleToggle = async (id: string) => {
    if (!user?.token) return;
    try {
      // Optimistic UI update
      setTodos(prev => prev.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t));
      await toggleTodo(id, user.token);
    } catch (err) {
      console.error("Failed to toggle:", err);
      loadTodos(); // Revert
    }
  };

  const handleSaveTodo = async (formData: any) => {
    if (!user?.token) return;

    try {
      setIsSaving(true);
      formData.userId = user.id;
      await saveTodo(null, formData, user.token);
      handleCloseModal();
      loadTodos();
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save task");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTodos = todos.filter(t => 
    t.task_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>TO DO List</h1>
            <p className={styles.subtitle}>Organize your day and track your progress.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchBar}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className={styles.addButton} onClick={() => handleOpenModal()}>
              <Plus size={20} />
              <span>Add New</span>
            </button>
          </div>
        </header>

        {error && (
          <div className={styles.errorBanner}>
            <p>{error}</p>
            <button onClick={loadTodos}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingContainer}>
            <Loader2 className={styles.spinner} size={48} />
            <p>Loading your tasks...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckSquare size={64} className={styles.emptyStateIcon} />
            <h3 className={styles.emptyStateTitle}>No tasks found</h3>
            <p className={styles.emptyStateDesc}>
              {searchQuery ? "Try adjusting your search query." : "You have no tasks pending. Add your first task to get started."}
            </p>
            {!searchQuery && (
              <button className={styles.addButton} onClick={() => handleOpenModal()}>
                <Plus size={20} />
                <span>Add Your First Task</span>
              </button>
            )}
          </div>
        ) : (
          <div className={styles.todoList}>
            {filteredTodos.map((todo) => (
              <div key={todo.id} className={`${styles.todoItem} ${todo.is_completed ? styles.todoItemCompleted : ''}`}>
                <div className={styles.todoContent} onClick={() => handleToggle(todo.id)}>
                  <button className={styles.checkButton}>
                    {todo.is_completed ? (
                      <CheckCircle size={24} className={styles.checkIconCompleted} />
                    ) : (
                      <Circle size={24} className={styles.checkIcon} />
                    )}
                  </button>
                  <div className={styles.todoDetails}>
                    <span className={`${styles.todoTitle} ${todo.is_completed ? styles.todoTitleCompleted : ''}`}>
                      {todo.task_name}
                    </span>
                    {todo.has_reminder && todo.reminder_date && (
                      <span className={styles.reminderBadge}>
                        🔔 Reminder: {new Date(todo.reminder_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <button className={styles.deleteButton} onClick={() => handleDelete(todo.id)}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        <TodoFormModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSaveTodo}
          isSaving={isSaving}
        />
      </div>
    </Layout>
  );
}
