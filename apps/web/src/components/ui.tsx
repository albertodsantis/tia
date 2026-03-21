import React from 'react';
import { X, type LucideIcon } from 'lucide-react';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type SurfaceTone = 'default' | 'muted' | 'inset';

const surfaceToneClasses: Record<SurfaceTone, string> = {
  default:
    'border border-slate-200/75 bg-white/88 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.16)] dark:border-slate-700/60 dark:bg-slate-800/82',
  muted:
    'border border-slate-200/80 bg-slate-50/90 shadow-[0_16px_32px_-30px_rgba(15,23,42,0.12)] dark:border-slate-700/60 dark:bg-slate-900/58',
  inset:
    'border border-slate-200/75 bg-white/94 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.14)] dark:border-slate-700/60 dark:bg-slate-900/48',
};

export function SurfaceCard({
  children,
  className,
  tone = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: SurfaceTone;
}) {
  return (
    <section
      className={cx(
        'rounded-[1.35rem] backdrop-blur-xl transition-colors duration-300',
        surfaceToneClasses[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ScreenHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  mobileOnly = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  mobileOnly?: boolean;
}) {
  return (
    <div className={cx('flex items-start justify-between gap-4', mobileOnly && 'lg:hidden', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-bold tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-[1.95rem] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  accentColor,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
  accentColor: string;
  className?: string;
}) {
  return (
    <SurfaceCard tone="inset" className={cx('p-4 sm:p-5', className)}>
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
      >
        <Icon size={20} strokeWidth={2.4} />
      </div>
      <p className="mt-4 text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      ) : null}
    </SurfaceCard>
  );
}

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  accent: '',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
};

export function StatusBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      style={
        tone === 'accent'
          ? {
              backgroundColor: 'var(--accent-soft-strong)',
              color: 'var(--accent-color)',
            }
          : undefined
      }
      className={cx(
        'inline-flex items-center rounded-[0.8rem] px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase',
        badgeToneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <SurfaceCard
      tone="muted"
      className={cx(
        'border-dashed px-6 py-8 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <Icon size={22} />
        </div>
      ) : null}
      <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </SurfaceCard>
  );
}

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  children,
  onClick,
  type = 'button',
  form,
  disabled,
  accentColor,
  tone = 'primary',
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  disabled?: boolean;
  accentColor?: string;
  tone?: ButtonTone;
  className?: string;
}) {
  const toneClass =
    tone === 'primary'
      ? 'border border-transparent shadow-[0_12px_30px_-16px_var(--accent-glow)]'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
        : tone === 'ghost'
          ? 'bg-transparent text-slate-500 dark:text-slate-400'
          : 'bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';

  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[0.95rem] px-4 py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        toneClass,
        className,
      )}
      style={
        tone === 'primary'
          ? {
              backgroundColor: accentColor || 'var(--accent-color)',
              color: 'var(--accent-foreground)',
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = 'secondary',
  accentColor,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: ButtonTone;
  accentColor?: string;
  className?: string;
}) {
  const toneClass =
    tone === 'primary'
      ? 'border border-transparent shadow-[0_12px_28px_-18px_var(--accent-glow)]'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
        : tone === 'ghost'
          ? 'bg-transparent text-slate-500 dark:text-slate-400'
          : 'bg-white text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'flex h-11 w-11 items-center justify-center rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
        toneClass,
        className,
      )}
      style={
        tone === 'primary'
          ? {
              backgroundColor: accentColor || 'var(--accent-color)',
              color: 'var(--accent-foreground)',
            }
          : undefined
      }
    >
      <Icon size={18} />
    </button>
  );
}

export function ToggleSwitch({
  checked,
  accentColor,
}: {
  checked: boolean;
  accentColor: string;
}) {
  return (
    <div
      className={cx(
        'relative h-7 w-14 rounded-full shadow-inner transition-colors',
        checked ? '' : 'bg-slate-200 dark:bg-slate-600',
      )}
      style={checked ? { backgroundColor: accentColor || 'var(--accent-color)' } : undefined}
    >
      <div
        className={cx(
          'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all',
          checked ? 'right-0.5' : 'left-0.5',
        )}
      />
    </div>
  );
}

export function SettingRow({
  icon: Icon,
  title,
  description,
  trailing,
  onClick,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</p>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx(
          'flex w-full items-center justify-between gap-4 rounded-[1rem] px-5 py-4 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/35',
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cx('flex items-center justify-between gap-4 rounded-[1rem] px-5 py-4', className)}>
      {content}
    </div>
  );
}

export function ModalPanel({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: string;
  description?: string;
  onClose?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const widthClass =
    size === 'sm'
      ? 'sm:w-[min(520px,92vw)]'
      : size === 'lg'
        ? 'sm:w-[min(860px,92vw)]'
        : 'sm:w-[min(680px,92vw)]';

  return (
    <div
      className={cx(
        'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-2xl dark:bg-slate-800 sm:rounded-[1.35rem]',
        widthClass,
      )}
    >
      <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-700/60 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-transform active:scale-95 dark:bg-slate-700 dark:text-slate-400"
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      {footer ? (
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-700/60 sm:px-6">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
