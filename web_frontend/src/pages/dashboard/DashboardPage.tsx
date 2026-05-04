import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  const displayName =
    user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
      : user?.phone ?? "User";

  return (
    <div className={styles.page}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.card}>
        <div className={styles.avatar}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <h1 className={styles.welcome}>Welcome back,</h1>
        <p className={styles.name}>{displayName}</p>
        {user?.email && <p className={styles.email}>{user.email}</p>}

        <div className={styles.badge}>
          <span className={styles.dot} />
          Logged in successfully
        </div>

        <p className={styles.note}>
          🚧 The web dashboard is under construction. More features coming soon!
        </p>

        <button className={styles.signOutBtn} onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
