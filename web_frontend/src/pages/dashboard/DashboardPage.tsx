import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  CreditCard, 
  CheckSquare, 
  Bell, 
  ArrowUpRight, 
  Clock, 
  Search,
  Plus,
  Loader2,
  BellRing
} from "lucide-react";
import Layout from "../../components/Layout";
import styles from "./DashboardPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { 
  fetchWarranties, 
  fetchSubscriptions, 
  fetchTodos, 
  fetchReminders,
  type Warranty, 
  type Subscription, 
  type Todo,
  type Reminder
} from "../../api/dashboard";
import MiniCalendar, { type CalEvent } from "../../components/MiniCalendar/MiniCalendar";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id || !user?.token) return;

      try {
        setLoading(true);
        const [wData, sData, tData, rData, notifResponse] = await Promise.all([
          fetchWarranties(user.id, user.token),
          fetchSubscriptions(user.id, user.token),
          fetchTodos(user.token),
          fetchReminders(user.id, user.token),
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications/unread-count`, { headers: { Authorization: `Bearer ${user.token}` } }).then(r => r.json())
        ]);

        setWarranties(wData || []);
        setSubscriptions(sData || []);
        setTodos(tData || []);
        setReminders(rData || []);
        setUnreadNotifications(notifResponse?.count || 0);
        setError(null);
      } catch (err: any) {
        console.error("Dashboard Load Error:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  // Derived stats
  const activeWarranties = warranties.filter(w => w.status === 'Active').length;
  const activeSubs = subscriptions.length;
  const pendingTodos = todos.filter(t => !t.is_completed).length;

  const stats = [
    { label: "Active Warranties", value: activeWarranties.toString(), icon: ShieldCheck, color: "#B9375D", path: "/warranties" },
    { label: "Subscriptions", value: activeSubs.toString(), icon: CreditCard, color: "#D25D5D", path: "/subscriptions" },
    { label: "Pending Tasks", value: pendingTodos.toString(), icon: CheckSquare, color: "#2ECC71", path: "/todos" },
    { label: "Notifications", value: unreadNotifications.toString(), icon: Bell, color: "#F1C40F", path: "/notifications" },
  ];

  // Helper to calculate days remaining
  const getDaysRemaining = (dateString: string) => {
    const today = new Date();
    const target = new Date(dateString);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Combine and sort expiring items
  const expiringSoon = [
    ...warranties.map(w => ({ 
      id: w.id, 
      name: w.product_name, 
      type: "Warranty", 
      date: w.expiry_date, 
      days: getDaysRemaining(w.expiry_date) 
    })),
    ...subscriptions.map(s => ({ 
      id: s.id, 
      name: s.service_name, 
      type: "Subscription", 
      date: s.next_billing_date, 
      days: getDaysRemaining(s.next_billing_date) 
    }))
  ]
  .filter(item => item.days <= 30 && item.days >= 0)
  .sort((a, b) => a.days - b.days)
  .slice(0, 5);

  const allSearchResults = searchQuery ? [
    ...warranties
      .filter(w => (w.product_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (w.category || "").toLowerCase().includes(searchQuery.toLowerCase()))
      .map(w => ({ id: w.id, name: w.product_name, type: "Warranty", sub: w.category, path: "/warranties", icon: ShieldCheck, color: "#B9375D" })),
    ...subscriptions
      .filter(s => (s.service_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (s.category || "").toLowerCase().includes(searchQuery.toLowerCase()))
      .map(s => ({ id: s.id, name: s.service_name, type: "Subscription", sub: s.category, path: "/subscriptions", icon: CreditCard, color: "#D25D5D" })),
    ...todos
      .filter(t => (t.task_name || "").toLowerCase().includes(searchQuery.toLowerCase()))
      .map(t => ({ id: t.id, name: t.task_name, type: "To-Do", sub: t.is_completed ? "Completed" : "Pending", path: "/todos", icon: CheckSquare, color: "#2ECC71" })),
    ...reminders
      .filter(r => (r.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || (r.type || "").toLowerCase().includes(searchQuery.toLowerCase()))
      .map(r => ({ id: r.id, name: r.title, type: "Reminder", sub: r.type, path: "/reminders", icon: BellRing, color: "#8B5CF6" }))
  ] : [];

  // Calculate all events for the Calendar
  const allEvents: CalEvent[] = [
    ...warranties.map(w => ({ date: w.expiry_date, type: "warranty", label: `${w.product_name} warranty` })),
    ...subscriptions.map(s => ({ date: s.next_billing_date, type: "subscription", label: s.service_name })),
    ...todos.filter(t => !t.is_completed && t.reminder_date).map(t => ({ date: t.reminder_date!, type: "todo", label: t.task_name })),
    ...reminders.filter(r => r.reminder_date).map(r => ({ date: r.reminder_date, type: "reminder", label: r.title }))
  ];

  const displayName = user?.firstName || user?.phone || "User";

  if (loading) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spinner} size={48} />
          <p>Loading your dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome back, {displayName}! 👋</h1>
          <p className={styles.subtitle}>Here's what's happening with your items today.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search warranties, subs, tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.dateDisplay}>
            <Clock size={16} />
            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.statCard} onClick={() => navigate(stat.path)}>
            <div className={styles.statIcon} style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>{stat.label}</p>
              <h3 className={styles.statValue}>{stat.value}</h3>
            </div>
            <div className={styles.statTrend}>
              <ArrowUpRight size={16} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.quickGrid}>
        <div className={styles.quickActionCard} onClick={() => navigate('/warranties', { state: { openModal: true, returnTo: '/dashboard' } })}>
          <div className={styles.quickActionIcon} style={{ backgroundColor: '#B9375D15', color: '#B9375D' }}>
            <ShieldCheck size={24} />
          </div>
          <span className={styles.quickActionLabel}>Add Warranty</span>
        </div>
        <div className={styles.quickActionCard} onClick={() => navigate('/subscriptions', { state: { openModal: true, returnTo: '/dashboard' } })}>
          <div className={styles.quickActionIcon} style={{ backgroundColor: '#D25D5D15', color: '#D25D5D' }}>
            <CreditCard size={24} />
          </div>
          <span className={styles.quickActionLabel}>Add Subscription</span>
        </div>
        <div className={styles.quickActionCard} onClick={() => navigate('/reminders', { state: { openModal: true, returnTo: '/dashboard' } })}>
          <div className={styles.quickActionIcon} style={{ backgroundColor: '#8B5CF615', color: '#8B5CF6' }}>
            <BellRing size={24} />
          </div>
          <span className={styles.quickActionLabel}>Add Reminder</span>
        </div>
        <div className={styles.quickActionCard} onClick={() => navigate('/todos', { state: { openModal: true, returnTo: '/dashboard' } })}>
          <div className={styles.quickActionIcon} style={{ backgroundColor: '#2ECC7115', color: '#2ECC71' }}>
            <CheckSquare size={24} />
          </div>
          <span className={styles.quickActionLabel}>Add To-Do</span>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {searchQuery ? (
          <section className={styles.section} style={{ gridColumn: '1 / -1' }}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Search Results for "{searchQuery}"</h2>
              <span className={styles.badge} style={{ background: 'var(--primary)', color: 'white' }}>{allSearchResults.length} found</span>
            </div>
            <div className={styles.list}>
              {allSearchResults.length > 0 ? (
                allSearchResults.map((item) => (
                  <div 
                    key={`${item.type}-${item.id}`} 
                    className={styles.listItem} 
                    onClick={() => navigate(item.path)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.itemIcon} style={{ color: item.color, backgroundColor: `${item.color}15` }}>
                      <item.icon size={18} />
                    </div>
                    <div className={styles.itemContent}>
                      <p className={styles.itemName}>{item.name}</p>
                      <p className={styles.itemSub}>{item.type} • {item.sub}</p>
                    </div>
                    <div className={styles.badge} style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                      View
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>No matching items found across the app.</p>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Expiring Soon Section */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Expiring Soon</h2>
                <button className={styles.viewAll}>View All</button>
              </div>
              <div className={styles.list}>
                {expiringSoon.length > 0 ? (
                  expiringSoon.map((item) => (
                    <div key={`${item.type}-${item.id}`} className={styles.listItem}>
                      <div className={styles.itemIcon}>
                        {item.type === "Warranty" ? <ShieldCheck size={18} /> : <CreditCard size={18} />}
                      </div>
                      <div className={styles.itemContent}>
                        <p className={styles.itemName}>{item.name}</p>
                        <p className={styles.itemSub}>{item.type} • {new Date(item.date).toLocaleDateString()}</p>
                      </div>
                      <div className={item.days <= 3 ? styles.badgeUrgent : styles.badge}>
                        {item.days} days left
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyState}>No items expiring soon.</p>
                )}
              </div>
            </section>

            {/* To-Dos Section */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Upcoming Tasks</h2>
                <button className={styles.viewAll} onClick={() => navigate('/todos')}>View All</button>
              </div>
              <div className={styles.list}>
                {todos.filter(t => !t.is_completed).length > 0 ? (
                  todos.filter(t => !t.is_completed).slice(0, 5).map((todo) => (
                    <div key={todo.id} className={styles.listItem}>
                      <div className={styles.todoCheckbox}></div>
                      <div className={styles.itemContent}>
                        <p className={styles.itemName}>{todo.task_name}</p>
                        <p className={styles.itemSub}>{todo.has_reminder ? `Reminder: ${new Date(todo.reminder_date!).toLocaleString()}` : 'No reminder set'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyState}>All caught up! No pending tasks.</p>
                )}
                <button className={styles.addTaskInline} onClick={() => navigate('/todos', { state: { openModal: true, returnTo: '/dashboard' } })}>
                  <Plus size={16} />
                  <span>Add a task</span>
                </button>
              </div>
            </section>

            {/* Calendar Section */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Calendar</h2>
              </div>
              <MiniCalendar events={allEvents} />
            </section>
          </>
        )}
      </div>

      {/* Upgrade Banner */}
      <div className={styles.upgradeBanner}>
        <div className={styles.upgradeContent}>
          <h3>Get the full Trakkit experience</h3>
          <p>Unlimited warranty documents, custom categories, and priority support.</p>
        </div>
        <button className={styles.upgradeBtn}>Upgrade to Premium</button>
      </div>
    </Layout>
  );
}
