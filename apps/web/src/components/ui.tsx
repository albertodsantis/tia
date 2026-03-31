import React from 'react';
import { X } from '@phosphor-icons/react';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type SurfaceTone = 'default' | 'muted' | 'inset';

const surfaceToneClasses: Record<SurfaceTone, string> = {
  default:
    'border bg-[var(--surface-card)] shadow-[var(--shadow-soft)] [border-color:var(--line-soft)]',
  muted:
    'border bg-[var(--surface-muted)] shadow-[var(--shadow-soft)] [border-color:var(--line-soft)]',
  inset:
    'border bg-[var(--surface-card-strong)] shadow-[0_16px_34px_-28px_rgba(59,43,34,0.16)] [border-color:var(--line-soft)]',
};

export function SurfaceCard({
  children,
  className,
  tone = 'default',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  tone?: SurfaceTone;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={cx(
        'rounded-[1.05rem] backdrop-blur-xl transition-colors duration-300',
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
          <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--text-secondary)]/80 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-[1.95rem] font-extrabold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
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
  icon: React.ElementType;
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
        <Icon size={20} />
      </div>
      <p className="mt-4 text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)]/80 uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs font-medium leading-5 text-[var(--text-secondary)]">
          {helper}
        </p>
      ) : null}
    </SurfaceCard>
  );
}

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'review';

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
  accent: '',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  review: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
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
  icon?: React.ElementType;
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
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--line-soft)] bg-[var(--surface-card-strong)] text-[var(--text-secondary)]">
          <Icon size={22} />
        </div>
      ) : null}
      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
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
      ? 'shadow-[0_12px_30px_-16px_var(--accent-glow)]'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
        : tone === 'ghost'
          ? 'bg-transparent text-[var(--text-secondary)]'
          : 'border bg-[var(--surface-card-strong)] text-[var(--text-primary)] [border-color:var(--line-soft)]';

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
              background: accentColor || 'var(--accent-gradient, var(--accent-color))',
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
  iconSize = 18,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: ButtonTone;
  accentColor?: string;
  className?: string;
  iconSize?: number;
}) {
  const toneClass =
    tone === 'primary'
      ? 'border border-transparent shadow-[0_12px_28px_-18px_var(--accent-glow)]'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
        : tone === 'ghost'
          ? 'bg-transparent text-[var(--text-secondary)]'
          : 'border bg-[var(--surface-card-strong)] text-[var(--text-secondary)] [border-color:var(--line-soft)]';

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
              background: accentColor || 'var(--accent-gradient, var(--accent-color))',
              color: 'var(--accent-foreground)',
            }
          : undefined
      }
    >
      <Icon size={iconSize} />
    </button>
  );
}

export function ToggleSwitch({
  checked,
  accentColor,
  disabled = false,
}: {
  checked: boolean;
  accentColor: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cx(
        'relative h-7 w-14 rounded-full shadow-inner transition-colors',
        checked ? '' : 'bg-[var(--surface-muted)]',
        disabled ? 'opacity-55' : '',
      )}
      style={checked ? { background: accentColor || 'var(--accent-gradient, var(--accent-color))' } : undefined}
      aria-hidden="true"
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
  icon: React.ElementType;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 items-center justify-center text-[var(--text-secondary)]">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
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
          'flex w-full items-center justify-between gap-4 rounded-[1rem] px-5 py-4 text-left transition-colors hover:bg-[var(--surface-muted)]/80',
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
        'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.5rem] border bg-[var(--surface-card-strong)] shadow-[var(--shadow-medium)] [border-color:var(--line-soft)] sm:rounded-[1.35rem]',
        widthClass,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at top left, var(--accent-soft-strong) 0%, rgba(255,255,255,0.2) 38%, transparent 72%)',
          opacity: 0.55,
        }}
      />
      <div className="relative border-b px-5 py-5 [border-color:var(--line-soft)] sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {description}
              </p>
            ) : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Cerrar modal"
            >
              <X size={18} weight="regular" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="relative flex-1 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      {footer ? (
        <div className="relative border-t px-5 py-4 [border-color:var(--line-soft)] sm:px-6">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 48,
  className,
}: {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const showFallback = !src || failed;

  React.useEffect(() => { setFailed(false); }, [src]);

  if (showFallback) {
    return (
      <div
        className={cx(
          'flex shrink-0 items-center justify-center rounded-[1rem] bg-[var(--surface-muted)] text-[var(--text-secondary)] select-none',
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        <span className="font-bold leading-none">{getInitials(name)}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className={cx('shrink-0 rounded-[1rem] object-cover', className)}
      style={{ width: size, height: size }}
    />
  );
}
