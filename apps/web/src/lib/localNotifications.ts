import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from '@shared';

function hashId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function notificationId(taskId: string, suffix: number): number {
  return ((hashId(taskId) * 10 + suffix) & 0x7fffffff) || suffix;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleDueDateReminders(tasks: Task[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    await LocalNotifications.cancel({
      notifications: await getPendingIds(),
    });

    const now = new Date();
    const pending: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];

    for (const task of tasks) {
      if (task.status === 'Completada' || task.status === 'Cobrado') continue;
      if (!task.dueDate) continue;

      const due = new Date(`${task.dueDate}T09:00:00`);
      if (isNaN(due.getTime())) continue;

      const dayBefore = new Date(due);
      dayBefore.setDate(dayBefore.getDate() - 1);

      if (dayBefore > now) {
        pending.push({
          id: notificationId(task.id, 1),
          title: 'Tarea próxima a vencer',
          body: task.title,
          schedule: { at: dayBefore, allowWhileIdle: true },
          smallIcon: 'ic_stat_icon_config_sample',
        });
      }

      if (due > now) {
        pending.push({
          id: notificationId(task.id, 2),
          title: 'Tarea vence hoy',
          body: task.title,
          schedule: { at: due, allowWhileIdle: true },
          smallIcon: 'ic_stat_icon_config_sample',
        });
      }
    }

    if (pending.length > 0) {
      await LocalNotifications.schedule({ notifications: pending });
    }
  } catch (error) {
    console.warn('scheduleDueDateReminders failed:', error);
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const ids = await getPendingIds();
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids });
    }
  } catch (error) {
    console.warn('cancelAllReminders failed:', error);
  }
}

async function getPendingIds(): Promise<{ id: number }[]> {
  try {
    const { notifications } = await LocalNotifications.getPending();
    return notifications.map((n) => ({ id: n.id }));
  } catch {
    return [];
  }
}
