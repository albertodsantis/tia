import type { BadgeKey, EfisystemAward, PointEventType, UserProfile } from '@shared';
import type { PostgresAppStore } from '../db/repository';

// ────────────────────────────────────────────────────────────
// Level thresholds
// ────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 250,
  3: 750,
  4: 1500,
  5: 3000,
  6: 4167,
  7: 5334,
  8: 6501,
  9: 7668,
  10: 10000,
};

function computeLevel(totalPoints: number): number {
  let level = 1;
  for (const [l, threshold] of Object.entries(LEVEL_THRESHOLDS)) {
    if (totalPoints >= threshold) level = Number(l);
  }
  return level;
}

// ────────────────────────────────────────────────────────────
// Profile completeness check
// ────────────────────────────────────────────────────────────

export function checkProfileComplete(profile: UserProfile): boolean {
  const hasSocial = Object.values(profile.socialProfiles).some(v => v?.trim().length > 0);
  const hasStat = profile.mediaKit.insightStats?.some(s => s.value?.trim().length > 0);
  return !!(
    profile.name?.trim() &&
    profile.handle?.trim() &&
    profile.avatar?.trim() &&
    hasSocial &&
    hasStat
  );
}

// ────────────────────────────────────────────────────────────
// GamificationService
// ────────────────────────────────────────────────────────────

export class GamificationService {
  constructor(private appStore: PostgresAppStore) {}

  async processEvent(userId: string, eventType: PointEventType): Promise<EfisystemAward> {
    const { totalPoints: currentTotal, currentLevel: prevLevel } =
      await this.appStore.getEfisystemSummary(userId);

    let pointsEarned = 0;

    switch (eventType) {
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
      case 'pipeline_task_moved': {
        const already = await this.appStore.hasTransaction(userId, eventType);
        if (!already) {
          const pts = POINTS[eventType];
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

      case 'pipeline_task_completed': {
        pointsEarned = 50;
        await this.appStore.insertTransaction(userId, eventType, 50);
        break;
      }

      case 'pipeline_task_paid': {
        pointsEarned = 100;
        await this.appStore.insertTransaction(userId, eventType, 100);
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

    const newBadges = await this.checkBadges(userId, eventType, newLevel, prevLevel);

    return { pointsEarned, newTotal, newLevel, leveledUp, newBadges };
  }

  private async checkBadges(
    userId: string,
    eventType: PointEventType,
    newLevel: number,
    prevLevel: number,
  ): Promise<BadgeKey[]> {
    const unlocked: BadgeKey[] = [];

    const tryUnlock = async (key: BadgeKey, condition: () => Promise<boolean>) => {
      if (await condition()) {
        const isNew = await this.appStore.unlockBadge(userId, key);
        if (isNew) unlocked.push(key);
      }
    };

    // Level badges
    for (const lvl of [2, 3, 4, 5, 10] as const) {
      if (newLevel >= lvl && prevLevel < lvl) {
        const key = `level_${lvl}` as BadgeKey;
        const isNew = await this.appStore.unlockBadge(userId, key as BadgeKey);
        if (isNew) unlocked.push(key as BadgeKey);
      }
    }

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
      await tryUnlock('motor_de_ideas', async () => {
        const c = await this.appStore.countTasksCreated(userId);
        return c >= 5;
      });
      await tryUnlock('promesa_cumplida', async () => {
        const c = await this.appStore.countCompletedTasks(userId);
        return c >= 10;
      });
      await tryUnlock('creador_imparable', async () => {
        const c = await this.appStore.countCompletedTasks(userId);
        return c >= 25;
      });
      await tryUnlock('negocio_en_marcha', async () => {
        const c = await this.appStore.countPaidTasks(userId);
        return c >= 5;
      });
      await tryUnlock('lluvia_de_billetes', async () => {
        const c = await this.appStore.countPaidTasks(userId);
        return c >= 20;
      });
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
  pipeline_task_moved: 10,
};
