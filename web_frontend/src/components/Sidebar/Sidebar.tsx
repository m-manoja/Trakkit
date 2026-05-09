import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  CreditCard, 
  Bell, 
  CheckSquare, 
  Settings, 
  LogOut,
  BellRing
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fetchUnreadCount } from "../../api/notifications";
import styles from "./Sidebar.module.css";
import logoImg from "../../assets/icon.png";

export default function Sidebar() {
  const { signOut, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.token) {
      fetchUnreadCount(user.token)
        .then(res => setUnreadCount(res.count))
        .catch(err => console.error("Failed to load badge count:", err));
    }
  }, [user]);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: ShieldCheck, label: "Warranties", path: "/warranties" },
    { icon: CreditCard, label: "Subscriptions", path: "/subscriptions" },
    { icon: BellRing, label: "Reminders", path: "/reminders" },
    { icon: CheckSquare, label: "To-Dos", path: "/todos" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src={logoImg} alt="Trakkit Logo" className={styles.logoImage} />
        <span className={styles.logoText}>Trakkit</span>
      </div>

      <nav className={styles.nav}>
        <div className={styles.sectionLabel}>Menu</div>
        {menuItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
          >
            <item.icon size={20} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.label === "Notifications" && unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
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
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="Avatar" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatar}>
              {(user?.firstName || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user?.firstName || "User"}</p>
            <p className={styles.userEmail}>{user?.email || "Free Plan"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
