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

    if (pointsEarned === 0) {
      return { pointsEarned: 0, newTotal: currentTotal, newLevel: prevLevel, leveledUp: false, newBadges: [] };
    }

    const newTotal = currentTotal + pointsEarned;
    const newLevel = computeLevel(newTotal);
    const leveledUp = newLevel > prevLevel;

    await this.appStore.upsertEfisystemSummary(userId, newTotal, newLevel);

    const newBadges = await this.checkBadges(userId, eventType);

    return { pointsEarned, newTotal, newLevel, leveledUp, newBadges };
  }

  private async checkBadges(
    userId: string,
    eventType: PointEventType,
  ): Promise<BadgeKey[]> {
    const unlocked: BadgeKey[] = [];

    const tryUnlock = async (key: BadgeKey, condition: () => Promise<boolean>) => {
      if (await condition()) {
        const isNew = await this.appStore.unlockBadge(userId, key);
        if (isNew) unlocked.push(key);
      }
    };

    if (eventType === 'config_profile_complete') {
      await tryUnlock('perfil_estelar', async () => true);
    }

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
    }

    if (eventType.startsWith('pipeline_')) {
      const [completedCount, paidCount] = await Promise.all([
        this.appStore.countCompletedTasks(userId),
        this.appStore.countPaidTasks(userId),
      ]);
      await tryUnlock('motor_de_ideas', async () => {
        const c = await this.appStore.countTasksCreated(userId);
        return c >= 5;
      });
      await tryUnlock('promesa_cumplida', async () => completedCount >= 10);
      await tryUnlock('creador_imparable', async () => completedCount >= 25);
      await tryUnlock('negocio_en_marcha', async () => paidCount >= 5);
      await tryUnlock('lluvia_de_billetes', async () => paidCount >= 20);
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
