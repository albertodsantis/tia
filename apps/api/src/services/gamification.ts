import type { BadgeKey, EfisystemAward, PointEventType, UserProfile } from '@shared';
import type { PostgresAppStore } from '../db/repository';

// ────────────────────────────────────────────────────────────
// Level thresholds
// ────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 475,
  5: 725,
  6: 1000,
  7: 1300,
  8: 1625,
  9: 1900,
  10: 2200,
  11: 2525,
  12: 2875,
  13: 3375,
  14: 3900,
  15: 4450,
  16: 5025,
  17: 5625,
  18: 6250,
  19: 7100,
  20: 7975,
  21: 8875,
  22: 9800,
  23: 10750,
  24: 11725,
  25: 12725,
  26: 14100,
  27: 15500,
  28: 16925,
  29: 18375,
  30: 19850,
  31: 21350,
  32: 22875,
  33: 24950,
  34: 27050,
  35: 29175,
  36: 31325,
  37: 33500,
  38: 35700,
  39: 37925,
  40: 41000,
  41: 44100,
  42: 47225,
  43: 50375,
  44: 53550,
  45: 58100,
  46: 62675,
  47: 67275,
  48: 71900,
  49: 78825,
  50: 85775,
};

const MAX_LEVEL = 50;
const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';

function computeLevel(totalPoints: number): number {
  let level = 1;
  for (let l = 2; l <= MAX_LEVEL; l++) {
    if (totalPoints >= LEVEL_THRESHOLDS[l]) level = l;
    else break;
  }
  return level;
}

// ────────────────────────────────────────────────────────────
// Profile completeness check
// ────────────────────────────────────────────────────────────

export function checkProfileComplete(profile: UserProfile): boolean {
  return !!(profile.name && (profile.efiProfile.links.length >= 1 || profile.tagline));
}

// ────────────────────────────────────────────────────────────
// Local-date helpers (for streak math in user's timezone)
// ────────────────────────────────────────────────────────────

/** YYYY-MM-DD in the given timezone for a given Date. */
function localDateISO(date: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date); // en-CA gives YYYY-MM-DD
}

/** Monday-based week key (YYYY-Www) in the given timezone. */
function weekKey(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  // ISO week calculation
  const target = new Date(d);
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  target.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNum =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** "YYYY-MM" from a YYYY-MM-DD string. */
function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function daysBetweenISO(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((db - da) / 86400000);
}

// ────────────────────────────────────────────────────────────
// GamificationService
// ────────────────────────────────────────────────────────────

export class GamificationService {
  constructor(private appStore: PostgresAppStore) {}

  async processEvent(
    userId: string,
    eventType: PointEventType,
    context: { taskId?: string; timezone?: string } = {},
  ): Promise<EfisystemAward> {
    const { totalPoints: currentTotal, currentLevel: prevLevel } =
      await this.appStore.getEfisystemSummary(userId);

    let pointsEarned = 0;

    switch (eventType) {
      case 'daily_login': {
        const todayCount = await this.appStore.countTodayTransactions(userId, eventType, context.timezone);
        if (todayCount === 0) {
          pointsEarned = 25;
          await this.appStore.insertTransaction(userId, eventType, 25);
        }
        break;
      }

      case 'daily_activity': {
        // No points; this event exists to update streak/pipeline-zen state and check those badges.
        const todayCount = await this.appStore.countTodayTransactions(userId, eventType, context.timezone);
        if (todayCount === 0) {
          await this.appStore.insertTransaction(userId, eventType, 0);
        }
        break;
      }

      case 'config_accent_change': {
        // Always insert the transaction (log every change), award only on 2nd
        await this.appStore.insertTransaction(userId, eventType, 0);
        const count = await this.appStore.countAllTransactions(userId, eventType);
        if (count === 2) {
          pointsEarned = 50;
          await this.appStore.updateLastTransactionPoints(userId, eventType, 50);
        }
        break;
      }

      case 'config_first_accent_change': {
        const already = await this.appStore.hasTransaction(userId, eventType);
        if (!already) {
          await this.appStore.insertTransaction(userId, eventType, 0);
        }
        break;
      }

      case 'goal_achieved': {
        // Every achievement logged; no point award here (badge-only).
        await this.appStore.insertTransaction(userId, eventType, 0);
        break;
      }

      case 'config_profile_complete':
      case 'config_first_goal':
      case 'network_first_partner':
      case 'network_first_contact':
      case 'pipeline_first_task':
      case 'pipeline_first_checklist_item':
      case 'pipeline_task_moved': {
        const already = await this.appStore.hasTransaction(userId, eventType);
        if (!already) {
          const pts = POINTS[eventType] ?? 0;
          pointsEarned = pts;
          await this.appStore.insertTransaction(userId, eventType, pts);
        }
        break;
      }

      case 'network_partner_subsequent':
      case 'network_contact_subsequent': {
        const todayCount = await this.appStore.countTodayTransactions(userId, eventType);
        if (todayCount < 10) {
          pointsEarned = 5;
          await this.appStore.insertTransaction(userId, eventType, 5);
        }
        break;
      }

      case 'pipeline_task_completed':
      case 'pipeline_task_paid': {
        // Only award the first time a given task reaches this status —
        // prevents farming by toggling a task back and forth.
        if (!context.taskId) break;
        const already = await this.appStore.hasTransactionForTask(userId, eventType, context.taskId);
        if (already) break;
        pointsEarned = eventType === 'pipeline_task_paid' ? 100 : 50;
        await this.appStore.insertTransaction(userId, eventType, pointsEarned, { taskId: context.taskId });
        break;
      }
    }

    // Side-effects that must run even when no points were awarded (streak, pipeline zen, etc.)
    if (eventType === 'daily_activity') {
      await this.updateDailyState(userId, context.timezone ?? DEFAULT_TZ);
    }

    const newTotal = currentTotal + pointsEarned;
    const newLevel = computeLevel(newTotal);
    const leveledUp = newLevel > prevLevel;

    if (pointsEarned > 0) {
      await this.appStore.upsertEfisystemSummary(userId, newTotal, newLevel);
    }

    const newBadges = await this.checkBadges(userId, eventType, context);

    return {
      pointsEarned,
      newTotal: pointsEarned > 0 ? newTotal : currentTotal,
      newLevel: pointsEarned > 0 ? newLevel : prevLevel,
      leveledUp: pointsEarned > 0 ? leveledUp : false,
      newBadges,
    };
  }

  /**
   * Called once per day (from the `daily_activity` event). Updates:
   * - login streak (consecutive days active),
   * - pipeline-zen days (consecutive days with 0 overdue tasks),
   * - perfect-weeks counter for the current month.
   */
  private async updateDailyState(userId: string, timezone: string): Promise<void> {
    const today = localDateISO(new Date(), timezone);
    const state = await this.appStore.getStreakState(userId);

    // Streak
    let currentStreak = state.currentStreakDays;
    let longestStreak = state.longestStreakDays;
    if (state.lastActiveDate === today) {
      // Already counted today — no change.
    } else if (state.lastActiveDate && daysBetweenISO(state.lastActiveDate, today) === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    // Pipeline zen: counts a day only if there's real pipeline to keep clean —
    // an account with no active tasks can't "manage" a pipeline, so it doesn't earn the badge.
    const [overdue, activeWithDue] = await Promise.all([
      this.appStore.countOverdueTasks(userId, today),
      this.appStore.countActiveTasksWithDueDate(userId),
    ]);
    let cleanDays = state.cleanPipelineDays;
    if (overdue > 0) {
      cleanDays = 0;
    } else if (activeWithDue > 0 && state.lastActiveDate !== today) {
      cleanDays += 1; // count at most once per day
    }

    // Perfect week: evaluated once per week, on week rollover.
    // We piggy-back on the per-day tick: if the previous active date belonged to a different ISO week
    // than today, we assess the just-finished week.
    let perfectWeeksCount = state.perfectWeeksCount;
    let perfectWeeksMonthKey = state.perfectWeeksMonthKey;

    if (state.lastActiveDate && state.lastActiveDate !== today) {
      const prevWeek = weekKey(state.lastActiveDate);
      const currWeek = weekKey(today);
      if (prevWeek !== currWeek) {
        const { perfect } = await this.assessWeekPerfection(userId, state.lastActiveDate, timezone);
        const monthOfPrev = monthKey(state.lastActiveDate);
        if (perfectWeeksMonthKey !== monthOfPrev) {
          // Entered a new month since last stored — reset counter for the new tracking window.
          perfectWeeksMonthKey = monthOfPrev;
          perfectWeeksCount = perfect ? 1 : 0;
        } else if (perfect) {
          perfectWeeksCount += 1;
        }
      }
    }

    await this.appStore.updateStreakFields(userId, {
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      lastActiveDate: today,
      cleanPipelineDays: cleanDays,
      perfectWeeksCount,
      perfectWeeksMonthKey,
    });
  }

  /**
   * A "perfect week" is a local week where the user had ≥3 completed tasks
   * and zero overdue tasks at the moment we evaluate it.
   */
  private async assessWeekPerfection(
    userId: string,
    dateInWeekIso: string,
    timezone: string,
  ): Promise<{ perfect: boolean }> {
    // Get the Monday of the given date's ISO week.
    const d = new Date(`${dateInWeekIso}T12:00:00Z`);
    const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - dayNum);

    let completed = 0;
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setUTCDate(monday.getUTCDate() + i);
      const iso = dayDate.toISOString().slice(0, 10);
      completed += await this.appStore.countTasksCompletedOnDate(userId, iso, timezone);
    }

    // Overdue check against today (the evaluation moment)
    const today = localDateISO(new Date(), timezone);
    const overdueToday = await this.appStore.countOverdueTasks(userId, today);

    return { perfect: completed >= 3 && overdueToday === 0 };
  }

  private async checkBadges(
    userId: string,
    eventType: PointEventType,
    context: { taskId?: string; timezone?: string } = {},
  ): Promise<BadgeKey[]> {
    const unlocked: BadgeKey[] = [];
    const tz = context.timezone ?? DEFAULT_TZ;

    const tryUnlock = async (key: BadgeKey, condition: () => Promise<boolean>) => {
      if (await condition()) {
        const isNew = await this.appStore.unlockBadge(userId, key);
        if (isNew) unlocked.push(key);
      }
    };

    // ── Sección 1 — Primeros Pasos ─────────────────────────────
    if (eventType === 'config_profile_complete') {
      await tryUnlock('perfil_estelar', async () => true);
    }
    if (eventType === 'pipeline_first_task') {
      await tryUnlock('primer_trazo', async () => true);
    }
    if (eventType === 'network_first_partner') {
      await tryUnlock('red_inicial', async () => true);
    }
    if (eventType === 'config_first_goal') {
      await tryUnlock('rumbo_fijo', async () => true);
    }
    if (eventType === 'config_first_accent_change') {
      await tryUnlock('identidad_propia', async () => true);
    }

    // ── Sección 2 — Network (y vision_clara/visionario_cumplido por goals) ─
    if (eventType.startsWith('network_')) {
      await tryUnlock('circulo_intimo', async () => {
        const c = await this.appStore.countPartners(userId);
        return c >= 5;
      });
      await tryUnlock('directorio_dorado', async () => {
        const [p, c] = await Promise.all([
          this.appStore.countPartners(userId),
          this.appStore.countContacts(userId),
        ]);
        return p >= 10 && c >= 10;
      });
      await tryUnlock('conector', async () => {
        const active = await this.appStore.countActivePartners(userId, 30);
        return active >= 10;
      });
    }

    if (eventType === 'config_first_goal' || eventType === 'goal_achieved') {
      await tryUnlock('vision_clara', async () => {
        const c = await this.appStore.countGoals(userId);
        return c >= 3;
      });
      await tryUnlock('visionario_cumplido', async () => {
        const c = await this.appStore.countGoalsAchieved(userId);
        return c >= 3;
      });
    }

    // ── Sección 2 — Pipeline volumen ───────────────────────────
    if (eventType.startsWith('pipeline_')) {
      const [completedCount, paidCount] = await Promise.all([
        this.appStore.countCompletedTasks(userId),
        this.appStore.countPaidTasks(userId),
      ]);
      await tryUnlock('motor_de_ideas', async () => {
        const c = await this.appStore.countTasksCreated(userId);
        return c >= 5;
      });
      await tryUnlock('fabrica_de_proyectos', async () => {
        const c = await this.appStore.countTasksCreated(userId);
        return c >= 25;
      });
      await tryUnlock('promesa_cumplida', async () => completedCount >= 10);
      await tryUnlock('creador_imparable', async () => completedCount >= 25);
      await tryUnlock('negocio_en_marcha', async () => paidCount >= 5);
      await tryUnlock('lluvia_de_billetes', async () => paidCount >= 20);
    }

    // ── Sección 3 — Hábitos ────────────────────────────────────
    if (
      eventType === 'pipeline_first_task' ||
      eventType === 'pipeline_task_moved' ||
      eventType === 'pipeline_task_completed' ||
      eventType === 'pipeline_task_paid'
    ) {
      await tryUnlock('madrugador', async () => {
        const d = await this.appStore.countDistinctDaysWithTaskCreatedBeforeHour(userId, 8, tz);
        return d >= 5;
      });
      await tryUnlock('noctambulo', async () => {
        const d = await this.appStore.countDistinctDaysWithTaskCreatedAtOrAfterHour(userId, 23, tz);
        return d >= 5;
      });
    }
    if (eventType === 'pipeline_task_completed' || eventType === 'pipeline_task_paid') {
      await tryUnlock('cierre_limpio', async () => {
        const c = await this.appStore.countTasksCompletedOnOriginalDate(userId);
        return c >= 5;
      });
      // Secret: 3 completed on the same local day
      await tryUnlock('tres_en_un_dia', async () => {
        return this.appStore.hasDayWithNCompletedTasks(userId, 3, tz);
      });
    }
    if (eventType === 'pipeline_task_paid') {
      await tryUnlock('cobrador_implacable', async () => {
        const c = await this.appStore.countTasksPaidWithinDays(userId, 7);
        return c >= 5;
      });
      // Secret: paid on weekend
      await tryUnlock('cobro_finde', async () => {
        return this.appStore.hasPaidOnWeekend(userId, tz);
      });
    }

    // ── Sección 4 — Rachas / Pipeline Zen / Semana Perfecta ───
    if (eventType === 'daily_activity') {
      const state = await this.appStore.getStreakState(userId);
      await tryUnlock('en_la_zona', async () => state.currentStreakDays >= 3);
      await tryUnlock('racha_de_hierro', async () => state.currentStreakDays >= 7);
      await tryUnlock('inamovible', async () => state.currentStreakDays >= 30);
      await tryUnlock('pipeline_zen', async () => state.cleanPipelineDays >= 7);
      await tryUnlock('semana_perfecta', async () => state.perfectWeeksCount >= 1);
      await tryUnlock('mes_de_oro', async () => state.perfectWeeksCount >= 4);
    }

    // ── Sección 5 — Ícono Efi (cross-cutting) ──────────────────
    const currentBadges = await this.appStore.getUnlockedBadges(userId);
    const unlockedCountIncludingNew = new Set([...currentBadges, ...unlocked]).size;
    if (unlockedCountIncludingNew >= 25) {
      await tryUnlock('icono_efi', async () => true);
    }

    return unlocked;
  }

  /** Merge two awards into one (used when two processEvent calls fire for one action). */
  static mergeAwards(a: EfisystemAward, b: EfisystemAward): EfisystemAward {
    return {
      pointsEarned: a.pointsEarned + b.pointsEarned,
      newTotal: Math.max(a.newTotal, b.newTotal),
      newLevel: Math.max(a.newLevel, b.newLevel),
      leveledUp: a.leveledUp || b.leveledUp,
      newBadges: [...a.newBadges, ...b.newBadges.filter(k => !a.newBadges.includes(k))],
    };
  }
}

// Points table (for one-time events)
const POINTS: Partial<Record<PointEventType, number>> = {
  config_profile_complete: 100,
  config_first_goal: 100,
  network_first_partner: 20,
  network_first_contact: 20,
  pipeline_first_task: 20,
  pipeline_first_checklist_item: 20,
  pipeline_task_moved: 10,
};
