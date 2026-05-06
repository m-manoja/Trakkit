import { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  CreditCard, 
  CheckSquare, 
  Bell, 
  ArrowUpRight, 
  Clock, 
  Search,
  Plus,
  Loader2
} from "lucide-react";
import Layout from "../../components/Layout";
import styles from "./DashboardPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { 
  fetchWarranties, 
  fetchSubscriptions, 
  fetchTodos, 
  type Warranty, 
  type Subscription, 
  type Todo 
} from "../../api/dashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id || !user?.token) return;

      try {
        setLoading(true);
        const [wData, sData, tData] = await Promise.all([
          fetchWarranties(user.id, user.token),
          fetchSubscriptions(user.id, user.token),
          fetchTodos(user.token)
        ]);

        setWarranties(wData || []);
        setSubscriptions(sData || []);
        setTodos(tData || []);
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
    { label: "Active Warranties", value: activeWarranties.toString(), icon: ShieldCheck, color: "#B9375D" },
    { label: "Subscriptions", value: activeSubs.toString(), icon: CreditCard, color: "#2563EB" },
    { label: "Pending Tasks", value: pendingTodos.toString(), icon: CheckSquare, color: "#059669" },
    { label: "Notifications", value: "0", icon: Bell, color: "#D97706" }, // Placeholder for notifications
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
      name: s.name, 
      type: "Subscription", 
      date: s.next_billing_date, 
      days: getDaysRemaining(s.next_billing_date) 
    }))
  ]
  .filter(item => item.days <= 30 && item.days >= 0)
  .sort((a, b) => a.days - b.days)
  .slice(0, 5);

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
            <input type="text" placeholder="Search warranties, subs..." />
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
          <div key={i} className={styles.statCard}>
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

      <div className={styles.mainGrid}>
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
            <button className={styles.viewAll}>View All</button>
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
            <button className={styles.addTaskInline}>
              <Plus size={16} />
              <span>Add a task</span>
            </button>
          </div>
        </section>
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
