import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CalendarCheck, Medal } from '@phosphor-icons/react';
import type { AppNotification } from '@shared';
import { cx } from './ui';
import { appApi } from '../lib/api';

type TabId = 'dashboard' | 'pipeline' | 'directory' | 'strategic' | 'profile' | 'settings';

interface Props {
  onNavigate: (tab: TabId) => void;
}

export default function NotificationBell({ onNavigate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await appApi.getNotifications();
      setNotifications(data.notifications);
      setHasUnread(data.hasUnread);
    } catch {
      // silently ignore — non-critical feature
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Re-check every 15 minutes while the tab is open
    const interval = setInterval(fetchNotifications, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const handleOpen = useCallback(async () => {
    const opening = !isOpen;
    setIsOpen(v => !v);
    if (opening && hasUnread) {
      setHasUnread(false);
      try {
        await appApi.markNotificationsSeen();
      } catch {
        // non-critical
      }
    }
  }, [isOpen, hasUnread]);

  const handleNotificationClick = useCallback(
    (n: AppNotification) => {
      setIsOpen(false);
      if (n.actionTab) {
        onNavigate(n.actionTab as TabId);
      }
    },
    [onNavigate],
  );

  const agendaNotifications = notifications.filter(n => n.category === 'agenda');
  const gamificationNotifications = notifications.filter(n => n.category === 'gamification');

  return (
    <div ref={containerRef} className="relative self-center shrink-0">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notificaciones"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cx(
          'relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
          isOpen
            ? 'bg-[var(--surface-card-strong)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-card-strong)] hover:text-[var(--text-primary)]',
        )}
      >
        <Bell size={18} weight={hasUnread ? 'fill' : 'regular'} />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--accent-color)] ring-2 ring-[var(--surface-bg)]" />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-full z-[130] mt-1.5 w-[320px] max-w-[calc(100vw-1rem)] origin-top-right rounded-[1rem] border bg-[var(--surface-card-strong)] shadow-[var(--shadow-floating)] [border-color:var(--line-soft)] animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-4 pt-3.5 pb-1">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              Notificaciones
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">Todo al día. ¡Buen trabajo!</p>
            </div>
          ) : (
            <div className="pb-2">
              {agendaNotifications.length > 0 && (
                <Section
                  label="Agenda"
                  icon={<CalendarCheck size={13} weight="bold" />}
                  items={agendaNotifications}
                  onItemClick={handleNotificationClick}
                />
              )}
              {gamificationNotifications.length > 0 && (
                <Section
                  label="Placas"
                  icon={<Medal size={13} weight="bold" />}
                  items={gamificationNotifications}
                  onItemClick={handleNotificationClick}
                  divider={agendaNotifications.length > 0}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  icon,
  items,
  onItemClick,
  divider,
}: {
  label: string;
  icon: React.ReactNode;
  items: AppNotification[];
  onItemClick: (n: AppNotification) => void;
  divider?: boolean;
}) {
  return (
    <>
      {divider && <div className="my-1 mx-3 border-t [border-color:var(--line-soft)]" />}
      <div className="px-2 pt-1">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <span className="text-[var(--text-secondary)]">{icon}</span>
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            {label}
          </span>
        </div>
        {items.map(n => (
          <button
            key={n.id}
            type="button"
            onClick={() => onItemClick(n)}
            className="w-full rounded-[0.75rem] px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-card)]"
          >
            <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">{n.title}</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-snug">{n.body}</p>
          </button>
        ))}
      </div>
    </>
  );
}
