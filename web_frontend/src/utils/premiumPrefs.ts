const STORAGE_PREFIX = '@trakkit_premium_prefs_';

export type PremiumPrefs = {
  familyEmails: string[];
  calendarSyncEnabled: boolean;
};

const defaults: PremiumPrefs = {
  familyEmails: [],
  calendarSyncEnabled: false,
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function getPremiumPrefs(userId: string): PremiumPrefs {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return {
      familyEmails: Array.isArray(parsed.familyEmails) ? parsed.familyEmails : [],
      calendarSyncEnabled: Boolean(parsed.calendarSyncEnabled),
    };
  } catch {
    return { ...defaults };
  }
}

export function savePremiumPrefs(userId: string, prefs: PremiumPrefs): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}

export function parseEmailList(input: string): string[] {
  return input
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}
