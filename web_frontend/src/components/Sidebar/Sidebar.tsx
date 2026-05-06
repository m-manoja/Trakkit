import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  CreditCard, 
  Bell, 
  CheckSquare, 
  Settings, 
  LogOut,
  Plus
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const { signOut, user } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: ShieldCheck, label: "Warranties", path: "/warranties" },
    { icon: CreditCard, label: "Subscriptions", path: "/subscriptions" },
    { icon: CheckSquare, label: "To-Dos", path: "/todos" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>T</div>
        <span className={styles.logoText}>Trakkit</span>
      </div>

      <button className={styles.addButton}>
        <Plus size={20} />
        <span>Add New</span>
      </button>

      <nav className={styles.nav}>
        <div className={styles.sectionLabel}>Menu</div>
        {menuItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <NavLink to="/settings" className={styles.navLink}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        
        <button onClick={() => signOut()} className={styles.signOutBtn}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>

        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            {(user?.firstName || "U").charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user?.firstName || "User"}</p>
            <p className={styles.userEmail}>{user?.email || "Free Plan"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
