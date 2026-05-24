import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';
import { API_BASE_URL } from '../../src/api/config';
import Header from '../../src/components/Header';
import GoogleCalendarSync from '../../src/components/GoogleCalendarSync';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DashboardData {
  subscriptions: any[];
  warranties: any[];
  reminders: any[];
  todos: any[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isThisWeek(dateStr: string) {
  if (!dateStr) return false;
  const now = new Date();
  const d = new Date(dateStr);
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

function isToday(dateStr: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function getMonthlySpend(subscriptions: any[]): number {
  return subscriptions
    .filter(s => (s.status || '').toLowerCase() === 'active')
    .reduce((acc: number, s: any) => {
      const amt = parseFloat(s.amount) || 0;
      const cycle = (s.billing_cycle || '').toLowerCase();
      if (cycle === 'weekly') return acc + amt * 4;
      if (cycle === 'yearly') return acc + amt / 12;
      return acc + amt;
    }, 0);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getUpcomingEvents(data: DashboardData) {
  const events: { date: string; label: string; type: string }[] = [];

  data.subscriptions.forEach(s => {
    const date = s.next_billing_date || s.start_date;
    if (date) events.push({ date, label: s.service_name, type: 'subscription' });
  });

  data.warranties.forEach(w => {
    if (w.expiry_date) events.push({ date: w.expiry_date, label: `${w.product_name} warranty`, type: 'warranty' });
  });

  data.reminders.forEach(r => {
    if (r.reminder_date) events.push({ date: r.reminder_date, label: r.title || r.name, type: 'reminder' });
  });

  data.todos.forEach(t => {
    if (!t.is_completed && t.reminder_date) events.push({ date: t.reminder_date, label: t.task_name, type: 'todo' });
  });

  return events
    .filter(e => new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  subscription: COLORS.primary,
  warranty: '#F97316',
  reminder: '#8B5CF6',
  todo: '#10B981',
};

const TYPE_ICONS: Record<string, string> = {
  subscription: 'card-outline',
  warranty: 'shield-checkmark-outline',
  reminder: 'alarm-outline',
  todo: 'checkbox-outline',
};

const TYPE_ROUTES: Record<string, string> = {
  subscription: '/(tabs)/subscription',
  warranty: '/(tabs)/warranty',
  reminder: '/(tabs)/reminder',
  todo: '/(tabs)/todo',
};

interface CalEvent { date: string; type: string; label: string; }

// ─── MINI CALENDAR ────────────────────────────────────────────────────────────

function MiniCalendar({ events }: { events: CalEvent[] }) {
  const today = new Date();
  const router = useRouter();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const eventMap: Record<number, CalEvent[]> = {};
  events.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      if (!eventMap[day]) eventMap[day] = [];
      eventMap[day].push(e);
    }
  });

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayPress = (day: number) => {
    setSelectedDay(day);
    setSheetVisible(true);
  };

  const selectedEvents = selectedDay ? (eventMap[selectedDay] || []) : [];
  const selectedDateLabel = selectedDay
    ? new Date(viewYear, viewMonth, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  return (
    <View style={calStyles.wrapper}>
      {/* Month nav */}
      <View style={calStyles.header}>
        <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
          <Ionicons name="chevron-back" size={18} color="#333" />
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={calStyles.row}>
        {weekDays.map(d => (
          <Text key={d} style={calStyles.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Day grid */}
      {Array.from({ length: cells.length / 7 }, (_, wi) => (
        <View key={wi} style={calStyles.row}>
          {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
            const isCurrentDay = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
            const isSelected = day === selectedDay;
            const dayEvents = day ? eventMap[day] : null;
            const types = dayEvents ? [...new Set(dayEvents.map(e => e.type))] : [];
            return (
              <TouchableOpacity
                key={di}
                style={calStyles.cell}
                onPress={() => day && handleDayPress(day)}
                activeOpacity={day ? 0.7 : 1}
                disabled={!day}
              >
                {day ? (
                  <>
                    <View style={[
                      calStyles.dayCircle,
                      isCurrentDay && calStyles.todayCircle,
                      isSelected && !isCurrentDay && calStyles.selectedCircle,
                    ]}>
                      <Text style={[
                        calStyles.dayNum,
                        isCurrentDay && calStyles.todayNum,
                        isSelected && !isCurrentDay && calStyles.selectedNum,
                      ]}>{day}</Text>
                    </View>
                    {types.length > 0 && (
                      <View style={calStyles.dots}>
                        {types.slice(0, 3).map(t => (
                          <View key={t} style={[calStyles.dot, { backgroundColor: TYPE_COLORS[t] || '#999' }]} />
                        ))}
                      </View>
                    )}
                  </>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={calStyles.legend}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <View key={type} style={calStyles.legendItem}>
            <View style={[calStyles.legendDot, { backgroundColor: color }]} />
            <Text style={calStyles.legendLabel}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
          </View>
        ))}
      </View>

      {/* Day detail bottom sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <TouchableOpacity
          style={calStyles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSheetVisible(false)}
        >
          <View style={calStyles.sheet} onStartShouldSetResponder={() => true}>
            <View style={calStyles.sheetHandle} />
            <View style={calStyles.sheetHeader}>
              <View>
                <Text style={calStyles.sheetDateLabel}>{selectedDateLabel}</Text>
                <Text style={calStyles.sheetEventCount}>
                  {selectedEvents.length === 0
                    ? 'No events'
                    : `${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSheetVisible(false)} style={calStyles.sheetCloseBtn}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={calStyles.sheetScroll} showsVerticalScrollIndicator={false}>
              {selectedEvents.length === 0 ? (
                <View style={calStyles.sheetEmpty}>
                  <Ionicons name="calendar-outline" size={48} color="#DDD" />
                  <Text style={calStyles.sheetEmptyText}>Nothing scheduled for this day</Text>
                </View>
              ) : (
                selectedEvents.map((ev, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={calStyles.sheetEventRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSheetVisible(false);
                      const route = TYPE_ROUTES[ev.type];
                      if (route) router.push(route as any);
                    }}
                  >
                    <View style={[calStyles.sheetEventIcon, { backgroundColor: (TYPE_COLORS[ev.type] || '#999') + '20' }]}>
                      <Ionicons
                        name={(TYPE_ICONS[ev.type] || 'ellipse-outline') as any}
                        size={18}
                        color={TYPE_COLORS[ev.type] || '#999'}
                      />
                    </View>
                    <View style={calStyles.sheetEventInfo}>
                      <Text style={calStyles.sheetEventLabel} numberOfLines={2}>{ev.label}</Text>
                      <View style={[calStyles.sheetTypeBadge, { backgroundColor: (TYPE_COLORS[ev.type] || '#999') + '15' }]}>
                        <Text style={[calStyles.sheetTypeBadgeText, { color: TYPE_COLORS[ev.type] || '#999' }]}>
                          {ev.type.charAt(0).toUpperCase() + ev.type.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CCC" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { user } = useAuth();
  const router = useRouter();
  const token = user?.token;
  const userId = user?.id;
  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'there';

  const [data, setData] = useState<DashboardData>({ subscriptions: [], warranties: [], reminders: [], todos: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setCalendarRefreshKey((k) => k + 1);
    }, [])
  );

  const fetchAll = useCallback(async () => {
    if (!token || !userId) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [subRes, warRes, remRes, todoRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/subscriptions/user/${userId}`, { headers }),
        axios.get(`${API_BASE_URL}/api/warranties/user/${userId}`, { headers }),
        axios.get(`${API_BASE_URL}/api/reminders/user/${userId}`, { headers }),
        axios.get(`${API_BASE_URL}/api/todos/user/${userId}`, { headers }),
      ]);

      setData({
        subscriptions: subRes.status === 'fulfilled' ? (subRes.value.data.data || []) : [],
        warranties: warRes.status === 'fulfilled' ? (warRes.value.data.data || []) : [],
        reminders: remRes.status === 'fulfilled' ? (remRes.value.data.data || []) : [],
        todos: todoRes.status === 'fulfilled' ? (todoRes.value.data.data || []) : [],
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── COMPUTED ─────────────────────────────────────────────────────────────

  const activeSubs = data.subscriptions.filter(s => (s.status || '').toLowerCase() === 'active').length;
  const monthlySpend = getMonthlySpend(data.subscriptions);
  const warrantiesCount = data.warranties.length;
  const dueThisWeek = [
    ...data.subscriptions.filter(s => isThisWeek(s.next_billing_date || s.start_date)),
    ...data.warranties.filter(w => isThisWeek(w.expiry_date)),
    ...data.reminders.filter(r => isThisWeek(r.reminder_date)),
    ...data.todos.filter(t => !t.is_completed && isThisWeek(t.reminder_date)),
  ].length;

  const allEvents = getUpcomingEvents(data);
  const upcomingEvents = showAllUpcoming ? allEvents : allEvents.slice(0, 5);
  const todayEvents = allEvents.filter(e => isToday(e.date));
  const pendingTodos = data.todos.filter(t => !t.is_completed).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <Header />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} colors={[COLORS.primary]} />}
      >

        {/* ─── HERO GREETING BANNER ─── */}
        <LinearGradient
          colors={[COLORS.primary, '#D25D7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroGreeting}>{getGreeting()},</Text>
              <Text style={styles.heroName}>{firstName} 👋</Text>
              <Text style={styles.heroSub}>
                {todayEvents.length === 0
                  ? 'No events scheduled today'
                  : `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} today`}
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeNum}>{dueThisWeek}</Text>
              <Text style={styles.heroBadgeLabel}>due{'\n'}this week</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ─── STAT GRID (2 × 2) ─── */}
        <View style={styles.statGrid}>
          <StatCard
            label="Active Subs"
            value={String(activeSubs)}
            icon="card-outline"
            color={COLORS.primary}
            onPress={() => router.push('/(tabs)/subscription')}
          />
          <StatCard
            label="Monthly Spend"
            value={`Rs ${monthlySpend.toFixed(0)}`}
            icon="cash-outline"
            color="#10B981"
            onPress={() => router.push('/(tabs)/subscription')}
          />
          <StatCard
            label="Warranties"
            value={String(warrantiesCount)}
            icon="shield-checkmark-outline"
            color="#F97316"
            onPress={() => router.push('/(tabs)/warranty')}
          />
          <StatCard
            label="Pending Todos"
            value={String(pendingTodos)}
            icon="checkbox-outline"
            color="#8B5CF6"
            onPress={() => router.push('/(tabs)/todo')}
          />
        </View>

        {/* ─── QUICK ACTIONS ─── */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.quickGrid}>
          <QuickAction icon="card-outline" label="Subscription" color={COLORS.primary} onPress={() => router.push('/(tabs)/subscription')} />
          <QuickAction icon="shield-checkmark-outline" label="Warranty" color="#F97316" onPress={() => router.push('/(tabs)/warranty')} />
          <QuickAction icon="alarm-outline" label="Reminder" color="#8B5CF6" onPress={() => router.push('/(tabs)/reminder')} />
          <QuickAction icon="list-outline" label="Todo" color="#10B981" onPress={() => router.push('/(tabs)/todo')} />
        </View>

        {/* ─── TODAY AT A GLANCE ─── */}
        <SectionHeader title="Today at a Glance" subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} />
        <View style={styles.card}>
          {todayEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="sunny-outline" size={36} color="#E5C98B" />
              <Text style={styles.emptyStateTitle}>All clear today!</Text>
              <Text style={styles.emptyStateSubtitle}>Nothing scheduled for today.</Text>
            </View>
          ) : (
            todayEvents.map((e, i) => (
              <EventRow key={i} event={e} showDate={false} />
            ))
          )}
        </View>

        {/* ─── UPCOMING EVENTS ─── */}
        <SectionHeader
          title="Upcoming Events"
          action={allEvents.length > 5 ? (showAllUpcoming ? 'Show Less' : `View All (${allEvents.length})`) : undefined}
          onAction={() => setShowAllUpcoming(v => !v)}
        />
        <View style={styles.card}>
          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={36} color="#CCC" />
              <Text style={styles.emptyStateTitle}>Nothing upcoming</Text>
              <Text style={styles.emptyStateSubtitle}>Add subscriptions, warranties or reminders to see events here.</Text>
            </View>
          ) : (
            upcomingEvents.map((e, i) => (
              <EventRow key={i} event={e} showDate />
            ))
          )}
        </View>

        {/* ─── CALENDAR ─── */}
        <SectionHeader title="Calendar" />
        <View style={styles.card}>
          <GoogleCalendarSync refreshKey={calendarRefreshKey} />
          <MiniCalendar events={allEvents} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatCard({ label, value, icon, color, onPress }: { label: string; value: string; icon: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statIconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function EventRow({ event, showDate }: { event: { date: string; label: string; type: string }; showDate: boolean }) {
  const color = TYPE_COLORS[event.type] || '#999';
  const icon = TYPE_ICONS[event.type] || 'ellipse-outline';
  const days = daysUntil(event.date);
  const urgency = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days <= 3 ? `In ${days} days` : null;

  return (
    <View style={styles.eventRow}>
      <View style={[styles.eventIconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventLabel} numberOfLines={1}>{event.label}</Text>
        {showDate && (
          <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
        )}
      </View>
      <View style={styles.eventRight}>
        {urgency && (
          <View style={[styles.urgencyBadge, { backgroundColor: days === 0 ? '#FEE2E2' : days <= 3 ? '#FEF3C7' : '#F3F4F6' }]}>
            <Text style={[styles.urgencyText, { color: days === 0 ? '#DC2626' : days <= 3 ? '#D97706' : '#6B7280' }]}>{urgency}</Text>
          </View>
        )}
        <View style={[styles.typePill, { backgroundColor: color + '15' }]}>
          <Text style={[styles.typePillText, { color }]}>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EFEF' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#999', fontSize: 14 },
  scrollContent: { paddingBottom: 160 },

  // Hero banner
  heroBanner: {
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 20,
    padding: 20,
    marginBottom: 6,
  },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  heroName: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  heroBadgeNum: { color: '#FFF', fontSize: 26, fontWeight: '800', lineHeight: 30 },
  heroBadgeLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center', lineHeight: 15 },

  // Stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  statIconBox: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#888', fontWeight: '500' },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  sectionSubtitle: { fontSize: 12, color: '#999', marginTop: 1 },
  sectionAction: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  // Quick actions grid
  quickGrid: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  quickActionIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: { fontSize: 11, color: '#444', fontWeight: '600' },

  // Generic card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },

  // Event rows
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  eventIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  eventInfo: { flex: 1 },
  eventLabel: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  eventDate: { fontSize: 11, color: '#999', marginTop: 2 },
  eventRight: { alignItems: 'flex-end', gap: 4 },
  urgencyBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  urgencyText: { fontSize: 10, fontWeight: '700' },
  typePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 10, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyStateTitle: { fontSize: 15, fontWeight: '700', color: '#555' },
  emptyStateSubtitle: { fontSize: 12, color: '#AAA', textAlign: 'center', paddingHorizontal: 20 },
});

// ─── CALENDAR STYLES ──────────────────────────────────────────────────────────

const calStyles = StyleSheet.create({
  wrapper: { marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  row: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#888', paddingBottom: 6 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: 42 },

  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: COLORS.primary },
  selectedCircle: { backgroundColor: COLORS.primary + '22', borderWidth: 1.5, borderColor: COLORS.primary },
  dayNum: { fontSize: 12, color: '#333' },
  todayNum: { color: '#FFF', fontWeight: '700' },
  selectedNum: { color: COLORS.primary, fontWeight: '700' },

  dots: { flexDirection: 'row', marginTop: 2, gap: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#666' },

  // Bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetDateLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  sheetEventCount: { fontSize: 12, color: '#888', marginTop: 2 },
  sheetCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  sheetScroll: { flexGrow: 0 },
  sheetEmpty: { alignItems: 'center', paddingVertical: 32 },
  sheetEmptyText: { fontSize: 13, color: '#BBB', marginTop: 10 },
  sheetEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  sheetEventIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  sheetEventInfo: { flex: 1 },
  sheetEventLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  sheetTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sheetTypeBadgeText: { fontSize: 11, fontWeight: '700' },
});