import { useCallback, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  CalendarDays,
  CheckSquare,
  Crown,
  FileText,
  Loader2,
  LogOut,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useAlert } from "../../context/AlertContext";
import { formatDate } from "../../utils/dateFormat";
import {
  deleteAdminUser,
  fetchAdminStats,
  fetchAdminUserDetail,
  fetchAdminUsers,
  type AdminStats,
  type AdminUser,
  type AdminUserDetail,
} from "../../api/admin";
import styles from "./AdminPortalPage.module.css";

const PAGE_SIZE = 20;

function fullName(u: { first_name: string | null; last_name: string | null }) {
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || "-";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateOrDash(value?: string | null) {
  return value ? formatDate(value) : "-";
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
        { label: "Total users", value: formatNumber(stats.totalUsers), meta: `${stats.newLast7Days} new this week`, icon: Users },
        { label: "Premium users", value: formatNumber(stats.premiumUsers), meta: `${stats.premiumRate}% of users`, icon: Crown },
        { label: "Verified users", value: formatNumber(stats.verifiedUsers), meta: `${stats.verificationRate}% verified`, icon: UserCheck },
        { label: "New users", value: formatNumber(stats.newLast30Days), meta: "Last 30 days", icon: UserPlus },
      ]
    : [];

  const appCards = stats
    ? [
        {
          label: "Warranties",
          value: stats.appData.warranties.total,
          detail: `${stats.appData.warranties.active} active, ${stats.appData.warranties.expiringNext30Days} expiring`,
          icon: FileText,
        },
        {
          label: "Subscriptions",
          value: stats.appData.subscriptions.total,
          detail: `${stats.appData.subscriptions.dueNext30Days} due soon, ${formatMoney(stats.appData.subscriptions.amountTotal)} tracked`,
          icon: CalendarDays,
        },
        {
          label: "Reminders",
          value: stats.appData.reminders.total,
          detail: `${stats.appData.notifications.pending} notifications pending`,
          icon: Bell,
        },
        {
          label: "To-dos",
          value: stats.appData.todos.total,
          detail: `${stats.appData.todos.open} open, ${stats.appData.todos.completed} done`,
          icon: CheckSquare,
        },
        {
          label: "Shares",
          value: stats.appData.shares.total,
          detail: "Shared app items",
          icon: Share2,
        },
        {
          label: "Push tokens",
          value: stats.appData.pushTokens.total,
          detail: `${stats.appData.notifications.sent} sent notifications`,
          icon: Smartphone,
        },
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

      <main className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin Overview</h1>
            <p className={styles.subtitle}>Users, app data, activity, and account summaries</p>
          </div>
        </div>

        <section className={styles.statsGrid} aria-label="User analytics">
          {statCards.map((c) => (
            <MetricCard key={c.label} label={c.label} value={c.value} meta={c.meta} icon={c.icon} />
          ))}
        </section>

        {stats && (
          <section className={styles.analyticsBand} aria-label="Platform analytics">
            <div className={styles.bandHeader}>
              <Activity size={18} />
              <span>Platform Data</span>
            </div>
            <div className={styles.appGrid}>
              {appCards.map((c) => (
                <DataCard key={c.label} label={c.label} value={c.value} detail={c.detail} icon={c.icon} />
              ))}
            </div>
          </section>
        )}

        {stats && (
          <section className={styles.rateStrip} aria-label="Account health">
            <Rate label="Profile completion" value={stats.profileCompletionRate} />
            <Rate label="Email verification" value={stats.verificationRate} />
            <Rate label="Premium adoption" value={stats.premiumRate} />
          </section>
        )}

        <form className={styles.searchBar} onSubmit={handleSearch}>
          <Search size={18} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by name, email or phone..."
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
                    <th>Data</th>
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
                      <td>{u.email || "-"}</td>
                      <td>{u.phone || "-"}</td>
                      <td>
                        <span
                          className={`${styles.planBadge} ${
                            u.plan === "premium" ? styles.planPremium : styles.planFree
                          }`}
                        >
                          {u.plan === "premium" ? "Premium" : "Free"}
                        </span>
                      </td>
                      <td>
                        <MiniCounts counts={u.counts} />
                      </td>
                      <td>{dateOrDash(u.created_at)}</td>
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
              {total} user{total === 1 ? "" : "s"} - Page {page} of {totalPages}
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
      </main>

      {(detail || detailLoading) && (
        <div className={styles.modalOverlay} onClick={() => setDetail(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>User Summary</h2>
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
                <div className={styles.detailGrid}>
                  <DetailRow label="Email" value={detail.email || "-"} />
                  <DetailRow label="Phone" value={detail.phone || "-"} />
                  <DetailRow label="Plan" value={detail.plan === "premium" ? "Premium" : "Free"} />
                  <DetailRow label="Email verified" value={detail.email_verified ? "Yes" : "No"} />
                  <DetailRow label="Profile completed" value={detail.profile_completed ? "Yes" : "No"} />
                  <DetailRow label="Joined" value={dateOrDash(detail.created_at)} />
                </div>

                <div className={styles.countsGrid}>
                  <Count label="Warranties" value={detail.counts.warranties} icon={FileText} />
                  <Count label="Subscriptions" value={detail.counts.subscriptions} icon={CalendarDays} />
                  <Count label="Reminders" value={detail.counts.reminders} icon={Bell} />
                  <Count label="To-dos" value={detail.counts.todos} icon={CheckSquare} />
                </div>

                <SummarySection title="Recent warranties">
                  {detail.summaries.warranties.length ? (
                    detail.summaries.warranties.map((item) => (
                      <SummaryItem
                        key={item.id}
                        title={item.product_name || "Untitled warranty"}
                        meta={`${item.status || "Unknown"} - expires ${dateOrDash(item.expiry_date)}`}
                        side={item.document_url ? "Document" : undefined}
                      />
                    ))
                  ) : (
                    <EmptySummary />
                  )}
                </SummarySection>

                <SummarySection title="Recent subscriptions">
                  {detail.summaries.subscriptions.length ? (
                    detail.summaries.subscriptions.map((item) => (
                      <SummaryItem
                        key={item.id}
                        title={item.service_name || "Untitled subscription"}
                        meta={`${item.billing_cycle || "No cycle"} - next ${dateOrDash(item.next_billing_date)}`}
                        side={item.amount == null ? undefined : String(item.amount)}
                      />
                    ))
                  ) : (
                    <EmptySummary />
                  )}
                </SummarySection>

                <SummarySection title="Upcoming reminders">
                  {detail.summaries.reminders.length ? (
                    detail.summaries.reminders.map((item) => (
                      <SummaryItem
                        key={item.id}
                        title={item.title || "Untitled reminder"}
                        meta={`${dateOrDash(item.reminder_date)} - ${item.repeat_cycle || item.reminder_schedule || "No repeat"}`}
                      />
                    ))
                  ) : (
                    <EmptySummary />
                  )}
                </SummarySection>

                <SummarySection title="Recent to-dos">
                  {detail.summaries.todos.length ? (
                    detail.summaries.todos.map((item) => (
                      <SummaryItem
                        key={item.id}
                        title={item.task_name || "Untitled to-do"}
                        meta={item.has_reminder ? `Reminder ${dateOrDash(item.reminder_date)}` : "No reminder"}
                        side={item.is_completed ? "Done" : "Open"}
                      />
                    ))
                  ) : (
                    <EmptySummary />
                  )}
                </SummarySection>

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

function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
}: {
  label: string;
  value: string;
  meta: string;
  icon: ComponentType<{ size?: number }>;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon}>
        <Icon size={22} />
      </div>
      <div>
        <p className={styles.statValue}>{value}</p>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statMeta}>{meta}</p>
      </div>
    </div>
  );
}

function DataCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ComponentType<{ size?: number }>;
}) {
  return (
    <div className={styles.dataCard}>
      <div className={styles.dataIcon}>
        <Icon size={18} />
      </div>
      <div>
        <span className={styles.dataValue}>{formatNumber(value)}</span>
        <span className={styles.dataLabel}>{label}</span>
        <span className={styles.dataDetail}>{detail}</span>
      </div>
    </div>
  );
}

function Rate({ label, value }: { label: string; value: number }) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={styles.rateItem}>
      <div className={styles.rateTop}>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <progress
        className={styles.rateTrack}
        value={clampedValue}
        max={100}
      />
    </div>
  );
}

function MiniCounts({ counts }: { counts?: AdminUser["counts"] }) {
  if (!counts) return <span className={styles.miniMuted}>-</span>;
  return (
    <div className={styles.miniCounts}>
      <span title="Warranties">W {counts.warranties}</span>
      <span title="Subscriptions">S {counts.subscriptions}</span>
      <span title="Reminders">R {counts.reminders}</span>
      <span title="To-dos">T {counts.todos}</span>
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

function Count({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ size?: number }>;
}) {
  return (
    <div className={styles.countCard}>
      <Icon size={18} />
      <span className={styles.countValue}>{value}</span>
      <span className={styles.countLabel}>{label}</span>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.summarySection}>
      <h3>{title}</h3>
      <div className={styles.summaryList}>{children}</div>
    </section>
  );
}

function SummaryItem({ title, meta, side }: { title: string; meta: string; side?: string }) {
  return (
    <div className={styles.summaryItem}>
      <div>
        <span className={styles.summaryTitle}>{title}</span>
        <span className={styles.summaryMeta}>{meta}</span>
      </div>
      {side && <span className={styles.summarySide}>{side}</span>}
    </div>
  );
}

function EmptySummary() {
  return <div className={styles.emptySummary}>No data yet.</div>;
}
