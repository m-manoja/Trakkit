import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Crown,
  UserCheck,
  UserPlus,
  Search,
  Trash2,
  Loader2,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useAlert } from "../../context/AlertContext";
import { formatDate } from "../../utils/dateFormat";
import {
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminUserDetail,
  deleteAdminUser,
  type AdminStats,
  type AdminUser,
  type AdminUserDetail,
} from "../../api/admin";
import styles from "./AdminPortalPage.module.css";

const PAGE_SIZE = 20;

function fullName(u: { first_name: string | null; last_name: string | null }) {
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || "—";
}

export default function AdminPortalPage() {
  const navigate = useNavigate();
  const { adminToken, signOutAdmin } = useAdminAuth();
  const { showAlert, showConfirm } = useAlert();
  const token = adminToken;

  const handleLogout = () => {
    signOutAdmin();
    navigate("/admin/login", { replace: true });
  };

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      setStats(await fetchAdminStats(token));
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  }, [token]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminUsers(token, { search, page, pageSize: PAGE_SIZE });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openDetail = async (id: string) => {
    if (!token) return;
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await fetchAdminUserDetail(token, id));
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!token) return;
    const ok = await showConfirm(
      `Permanently delete ${fullName(u)} (${u.email || u.phone || "no contact"}) and all of their data? This cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(u.id);
    try {
      await deleteAdminUser(token, u.id);
      setDetail((d) => (d?.id === u.id ? null : d));
      await Promise.all([loadUsers(), loadStats()]);
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, icon: Users },
        { label: "Premium", value: stats.premiumUsers, icon: Crown },
        { label: "Verified", value: stats.verifiedUsers, icon: UserCheck },
        { label: "New (30d)", value: stats.newLast30Days, icon: UserPlus },
      ]
    : [];

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <ShieldCheck size={22} />
          <span>Trakkit Admin</span>
        </div>
        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>User Management</h1>
            <p className={styles.subtitle}>Manage all registered users</p>
          </div>
        </div>

        <div className={styles.statsGrid}>
          {statCards.map((c) => (
            <div key={c.label} className={styles.statCard}>
              <div className={styles.statIcon}>
                <c.icon size={22} />
              </div>
              <div>
                <p className={styles.statValue}>{c.value}</p>
                <p className={styles.statLabel}>{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        <form className={styles.searchBar} onSubmit={handleSearch}>
          <Search size={18} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by name, email or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
          {search && (
            <button
              type="button"
              className={styles.clearButton}
              aria-label="Clear search"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className={styles.tableCard}>
          {loading ? (
            <div className={styles.center}>
              <Loader2 className={styles.spinner} size={28} />
            </div>
          ) : error ? (
            <div className={styles.center}>
              <p className={styles.errorText}>{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className={styles.center}>
              <p>No users found.</p>
            </div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Plan</th>
                    <th>Joined</th>
                    <th aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} onClick={() => openDetail(u.id)} className={styles.row}>
                      <td>
                        <span className={styles.nameCell}>{fullName(u)}</span>
                      </td>
                      <td>{u.email || "—"}</td>
                      <td>{u.phone || "—"}</td>
                      <td>
                        <span
                          className={`${styles.planBadge} ${
                            u.plan === "premium" ? styles.planPremium : styles.planFree
                          }`}
                        >
                          {u.plan === "premium" ? "Premium" : "Free"}
                        </span>
                      </td>
                      <td>{u.created_at ? formatDate(u.created_at) : "—"}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          title="Delete user"
                          disabled={deletingId === u.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(u);
                          }}
                        >
                          {deletingId === u.id ? (
                            <Loader2 size={16} className={styles.spinner} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !error && total > 0 && (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              {total} user{total === 1 ? "" : "s"} · Page {page} of {totalPages}
            </span>
            <div className={styles.pageButtons}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={styles.pageBtn}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {(detail || detailLoading) && (
        <div className={styles.modalOverlay} onClick={() => setDetail(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>User Details</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setDetail(null)} title="Close">
                <X size={20} />
              </button>
            </div>
            {detailLoading || !detail ? (
              <div className={styles.center}>
                <Loader2 className={styles.spinner} size={26} />
              </div>
            ) : (
              <div className={styles.modalBody}>
                <div className={styles.detailName}>{fullName(detail)}</div>
                <DetailRow label="Email" value={detail.email || "—"} />
                <DetailRow label="Phone" value={detail.phone || "—"} />
                <DetailRow label="Plan" value={detail.plan === "premium" ? "Premium" : "Free"} />
                <DetailRow
                  label="Email verified"
                  value={detail.email_verified ? "Yes" : "No"}
                />
                <DetailRow
                  label="Profile completed"
                  value={detail.profile_completed ? "Yes" : "No"}
                />
                <DetailRow
                  label="Joined"
                  value={detail.created_at ? formatDate(detail.created_at) : "—"}
                />

                <div className={styles.countsGrid}>
                  <Count label="Warranties" value={detail.counts.warranties} />
                  <Count label="Subscriptions" value={detail.counts.subscriptions} />
                  <Count label="Reminders" value={detail.counts.reminders} />
                  <Count label="To-Dos" value={detail.counts.todos} />
                </div>

                <button
                  type="button"
                  className={styles.modalDeleteBtn}
                  disabled={deletingId === detail.id}
                  onClick={() => handleDelete(detail)}
                >
                  {deletingId === detail.id ? (
                    <Loader2 size={18} className={styles.spinner} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Delete user
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.countCard}>
      <span className={styles.countValue}>{value}</span>
      <span className={styles.countLabel}>{label}</span>
    </div>
  );
}
