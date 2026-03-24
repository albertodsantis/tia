import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Activity,
  AlignLeft,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  Copy,
  Instagram,
  Mail,
  MessageSquare,
  PencilLine,
  Plus,
  Search,
  Send,
  Trash2,
  Type,
  Users,
} from 'lucide-react';
import { Contact, Partner, TaskStatus } from '@shared/domain';
import ConfirmDialog from '../components/ConfirmDialog';
import OverlayModal from '../components/OverlayModal';
import {
  Button,
  EmptyState,
  IconButton,
  ModalPanel,
  StatusBadge,
  SurfaceCard,
  cx,
} from '../components/ui';
import CustomSelect from '../components/CustomSelect';
import { parseLocalDate } from '../lib/date';
import { toast } from '../lib/toast';

const PARTNER_STATUSES = [
  'Prospecto',
  'En Negociaci\u00f3n',
  'Activo',
  'Inactivo',
  'On Hold',
  'Relaci\u00f3n Culminada',
] as const;

const STATUS_LABELS: Record<Partner['status'], string> = {
  Prospecto: 'Prospecto',
  'En Negociaci\u00f3n': 'En negociación',
  Activo: 'Activo',
  Inactivo: 'Inactivo',
  'On Hold': 'En pausa',
  'Relaci\u00f3n Culminada': 'Relación cerrada',
};

const STATUS_TONES: Record<Partner['status'], React.ComponentProps<typeof StatusBadge>['tone']> = {
  Prospecto: 'info',
  'En Negociaci\u00f3n': 'warning',
  Activo: 'success',
  Inactivo: 'neutral',
  'On Hold': 'warning',
  'Relaci\u00f3n Culminada': 'danger',
};

const fieldClass =
  'w-full rounded-[1rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2';

const statusLabel = (status: Partner['status']) => STATUS_LABELS[status] ?? status;
const statusTone = (status: Partner['status']) => STATUS_TONES[status] ?? 'neutral';
const taskStatusTone = (
  status: TaskStatus,
): React.ComponentProps<typeof StatusBadge>['tone'] => {
  if (status === 'Pendiente') return 'warning';
  if (status === 'En Progreso') return 'info';
  if (status === 'En Revisión') return 'accent';
  if (status === 'Completada') return 'success';
  return 'neutral';
};
const formatCurrency = (value: number) => `$${value.toLocaleString('es-ES')}`;
const formatTaskDate = (value: string, options?: Intl.DateTimeFormatOptions) =>
  parseLocalDate(value).toLocaleDateString(
    'es-ES',
    options ?? {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );

export default function Directory() {
  const {
    partners,
    accentColor,
    templates,
    profile,
    addContact,
    updateContact,
    deleteContact,
    updatePartner,
    addPartner,
    tasks,
  } = useAppContext();
  const [search, setSearch] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(partners[0]?.id ?? null);
  const [composingTo, setComposingTo] = useState<{ contact: Contact; partner: Partner } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messagePreview, setMessagePreview] = useState({ subject: '', body: '' });
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [addingContactTo, setAddingContactTo] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<{ partnerId: string; contact: Contact } | null>(null);
  const [contactPendingDeletion, setContactPendingDeletion] = useState<{
    partnerId: string;
    contact: Contact;
  } | null>(null);
  const [newPartner, setNewPartner] = useState({ name: '', status: 'Prospecto' as Partner['status'] });
  const [newContact, setNewContact] = useState({ name: '', role: '', email: '', ig: '' });

  const filteredPartners = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return partners;
    return partners.filter((partner) => {
      const partnerMatch = partner.name.toLowerCase().includes(query);
      const contactMatch = partner.contacts.some((contact) =>
        [contact.name, contact.role, contact.email, contact.ig]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query)),
      );
      return partnerMatch || contactMatch;
    });
  }, [partners, search]);

  const activePartner = useMemo(() => {
    if (filteredPartners.length === 0) return null;
    return filteredPartners.find((partner) => partner.id === selectedPartnerId) ?? filteredPartners[0];
  }, [filteredPartners, selectedPartnerId]);

  const partnerTaskMeta = useMemo(
    () =>
      partners.reduce(
        (accumulator, partner) => {
          const partnerTasks = tasks.filter((task) => task.partnerId === partner.id);
          accumulator[partner.id] = {
            total: partnerTasks.length,
            open: partnerTasks.filter((task) => task.status !== 'Cobrado').length,
          };
          return accumulator;
        },
        {} as Record<string, { total: number; open: number }>,
      ),
    [partners, tasks],
  );

  const activePartnerTasks = useMemo(() => {
    if (!activePartner) return [];
    return [...tasks]
      .filter((task) => task.partnerId === activePartner.id)
      .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());
  }, [activePartner, tasks]);

  const openTasks = activePartnerTasks.filter((task) => task.status !== 'Cobrado');
  const activePartnerOpenValue = openTasks.reduce((sum, task) => sum + task.value, 0);
  const nextDueTask = openTasks[0] ?? activePartnerTasks[0] ?? null;
  const totalContacts = partners.reduce((sum, partner) => sum + partner.contacts.length, 0);
  const activePartners = partners.filter((partner) => partner.status === 'Activo').length;

  useEffect(() => {
    if (filteredPartners.length === 0) {
      setSelectedPartnerId(null);
      return;
    }
    if (!selectedPartnerId || !filteredPartners.some((partner) => partner.id === selectedPartnerId)) {
      setSelectedPartnerId(filteredPartners[0].id);
    }
  }, [filteredPartners, selectedPartnerId]);

  const closeComposer = () => {
    setComposingTo(null);
    setSelectedTemplateId('');
    setMessagePreview({ subject: '', body: '' });
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (!template || !composingTo) {
      setMessagePreview({ subject: '', body: '' });
      return;
    }

    const partnerTasks = tasks.filter((task) => task.partnerId === composingTo.partner.id && task.status !== 'Cobrado');
    const relevantTask = partnerTasks.length > 0 ? partnerTasks[0] : null;
    const deliverable = relevantTask ? `${relevantTask.title} (${relevantTask.description})` : '[Entregable no especificado]';
    const replaceVars = (text: string) =>
      text
        .replace(/{{brandName}}/g, composingTo.partner.name)
        .replace(/{{contactName}}/g, composingTo.contact.name.split(' ')[0])
        .replace(/{{creatorName}}/g, profile.name)
        .replace(/{{deliverable}}/g, deliverable);

    setMessagePreview({
      subject: replaceVars(template.subject),
      body: replaceVars(template.body),
    });
  };

  const handleSend = () => {
    if (!composingTo) return;
    const mailto = `mailto:${composingTo.contact.email}?subject=${encodeURIComponent(messagePreview.subject)}&body=${encodeURIComponent(messagePreview.body)}`;
    window.open(mailto, '_blank');
    closeComposer();
  };

  const handleAddPartner = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newPartner.name.trim();
    if (!name) return;
    const partnerId = await addPartner({ name, status: newPartner.status, contacts: [] });
    setSelectedPartnerId(partnerId);
    setIsAddingPartner(false);
    setNewPartner({ name: '', status: 'Prospecto' });
    toast.success(`Marca ${name} añadida al directorio`);
  };

  const handleAddContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addingContactTo) return;
    await addContact(addingContactTo, newContact);
    setAddingContactTo(null);
    setNewContact({ name: '', role: '', email: '', ig: '' });
    toast.success('Contacto guardado');
  };

  const handleEditContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingContact) return;
    await updateContact(editingContact.partnerId, editingContact.contact.id, editingContact.contact);
    setEditingContact(null);
    toast.success('Contacto actualizado');
  };

  const handleDeleteContact = async () => {
    if (!contactPendingDeletion) return;

    await deleteContact(contactPendingDeletion.partnerId, contactPendingDeletion.contact.id);
    setContactPendingDeletion(null);
    toast.info('Contacto eliminado');
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  return (
    <div className="space-y-5 p-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:px-8 lg:pt-4 lg:pb-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(310px,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Building2, label: 'Marcas', value: String(partners.length), helper: 'En el workspace' },
              { icon: Users, label: 'Activos', value: String(activePartners), helper: 'Relaciones vivas' },
              { icon: Mail, label: 'Contactos', value: String(totalContacts), helper: 'Canales listos' },
            ].map((item, index) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-3 px-3 py-2"
                style={
                  index === 0
                    ? { color: accentColor }
                    : undefined
                }
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
                >
                  <item.icon size={15} strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--text-secondary)]/70 uppercase">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <SurfaceCard className="p-4 sm:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={20} />
              <input
                type="text"
                placeholder="Buscar marcas o contactos"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={cx(fieldClass, 'py-4 pl-14 pr-5 text-[15px]')}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between px-2 pt-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">Lista</p>
                <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">Marcas y contactos</h2>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone="neutral">{filteredPartners.length} resultados</StatusBadge>
                <Button accentColor={accentColor} onClick={() => setIsAddingPartner(true)} className="px-3 py-2 text-xs">
                  <Plus size={14} />
                  Añadir
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {filteredPartners.map((partner) => {
                const isActive = activePartner?.id === partner.id;
                const meta = partnerTaskMeta[partner.id] ?? { total: 0, open: 0 };
                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={cx(
                      'w-full rounded-[1rem] border px-4 py-4 text-left transition-all',
                      isActive
                        ? 'border-transparent bg-[var(--surface-card-strong)] shadow-[var(--shadow-soft)]'
                        : 'border-transparent bg-[var(--surface-card)]/75 hover:bg-[var(--surface-muted)]/90',
                    )}
                    style={isActive ? { borderColor: 'var(--accent-border)', backgroundColor: 'var(--accent-soft)' } : undefined}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className={cx('flex h-11 w-11 items-center justify-center rounded-[0.95rem] text-sm font-black', isActive ? 'bg-white/85 text-[var(--text-primary)]' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]')}>
                            <Building2 size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold leading-tight text-[var(--text-primary)]">{partner.name}</h3>
                            <p className={cx('mt-1 text-xs font-medium', isActive ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]')}>
                              {partner.contacts.length} contactos · {meta.open} abiertas
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <StatusBadge tone={statusTone(partner.status)}>{statusLabel(partner.status)}</StatusBadge>
                        <ChevronDown size={18} className={cx('transition-transform', isActive ? 'rotate-180 text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]/80')} />
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredPartners.length === 0 && (
                <EmptyState
                  icon={Building2}
                  title="No hay resultados"
                  description="Prueba con otro termino o crea una nueva marca para empezar."
                  className="border-dashed"
                  action={
                    <Button accentColor={accentColor} onClick={() => setIsAddingPartner(true)}>
                      <Plus size={16} />
                      Añadir marca
                    </Button>
                  }
                />
              )}
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-4">
          {activePartner ? (
            <SurfaceCard className="overflow-hidden p-0">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">Marca activa</p>
                    <h2 className="mt-1.5 text-[1.55rem] font-bold tracking-tight text-[var(--text-primary)]">{activePartner.name}</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusBadge tone={statusTone(activePartner.status)}>{statusLabel(activePartner.status)}</StatusBadge>
                      {nextDueTask ? <StatusBadge tone="neutral">{formatTaskDate(nextDueTask.dueDate)}</StatusBadge> : null}
                    </div>
                  </div>

                  <CustomSelect
                    value={activePartner.status}
                    onChange={(val) => void updatePartner(activePartner.id, { status: val as Partner['status'] })}
                    options={PARTNER_STATUSES.map(s => ({ value: s, label: statusLabel(s) }))}
                    buttonStyle={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    ariaLabel={`Cambiar estado de ${activePartner.name}`}
                    className="w-full sm:w-auto sm:min-w-[180px]"
                    buttonClassName="shadow-sm"
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="min-w-[140px] flex-1 rounded-[1rem] border border-[color:var(--line-soft)] bg-[var(--surface-muted)]/65 px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]/70">Contactos</p>
                    <p className="mt-2 text-[1.25rem] font-bold text-[var(--text-primary)]">{activePartner.contacts.length}</p>
                  </div>
                  <div className="min-w-[140px] flex-1 rounded-[1rem] border border-[color:var(--line-soft)] bg-[var(--surface-muted)]/65 px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]/70">Tareas abiertas</p>
                    <p className="mt-2 text-[1.25rem] font-bold text-[var(--text-primary)]">{openTasks.length}</p>
                  </div>
                  <div className="min-w-[140px] flex-1 rounded-[1rem] border border-[color:var(--line-soft)] bg-[var(--surface-muted)]/65 px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]/70">Valor abierto</p>
                    <p className="mt-2 text-[1.25rem] font-bold text-[var(--text-primary)]">{formatCurrency(activePartnerOpenValue)}</p>
                  </div>
                </div>

                {nextDueTask ? (
                  <div className="mt-5 rounded-[1.1rem] border border-[color:var(--line-soft)] bg-[var(--surface-card)]/85 px-4 py-4 shadow-[var(--shadow-soft)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]/70">Próximo movimiento</p>
                    <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[var(--text-primary)]">{nextDueTask.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {nextDueTask.description || 'Añade una descripción para dejar claro el siguiente paso con esta marca.'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <StatusBadge tone={taskStatusTone(nextDueTask.status)}>{nextDueTask.status}</StatusBadge>
                        <StatusBadge tone="neutral">{formatTaskDate(nextDueTask.dueDate)}</StatusBadge>
                        <StatusBadge tone="accent">{formatCurrency(nextDueTask.value)}</StatusBadge>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[color:var(--line-soft)] bg-[var(--surface-muted)]/50 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">Pipeline abierto</p>
                  <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">Próximos deliverables</h3>
                </div>
                <StatusBadge tone="neutral">{openTasks.length} abiertas</StatusBadge>
              </div>

              <div className="space-y-3">
                {openTasks.length > 0 ? (
                  openTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="rounded-[1rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)]/70 px-4 py-4 transition-colors duration-200 hover:bg-[var(--surface-muted)]/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{task.title}</p>
                          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                            {task.description || 'Sin descripción todavía.'}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-[var(--text-primary)]">
                          {formatCurrency(task.value)}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge tone={taskStatusTone(task.status)}>{task.status}</StatusBadge>
                        <StatusBadge tone="neutral">{formatTaskDate(task.dueDate)}</StatusBadge>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={CalendarDays}
                    title="Sin tareas abiertas"
                    description="Esta marca no tiene entregables activos ahora mismo."
                    className="py-10"
                  />
                )}
              </div>
              </div>

              <div className="border-t border-[color:var(--line-soft)] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">Contactos</p>
                  <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">Red de la marca</h3>
                </div>
                <Button accentColor={accentColor} onClick={() => setAddingContactTo(activePartner.id)}>
                  <Plus size={16} />
                  Añadir contacto
                </Button>
              </div>

              <div className="divide-y divide-[color:var(--line-soft)]/70">
                {activePartner.contacts.length > 0 ? (
                  activePartner.contacts.map((contact, index) => (
                    <div
                      key={contact.id}
                      className={cx(
                        'py-4',
                        index === 0 && 'pt-0',
                        index === activePartner.contacts.length - 1 && 'pb-0',
                      )}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-[var(--text-primary)]">{contact.name}</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">{contact.role}</p>
                          <div className="mt-3 flex flex-wrap gap-3">
                            <div className="group flex items-center gap-1">
                              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                                <Mail size={16} /> {contact.email}
                              </a>
                              <button type="button" onClick={() => handleCopy(contact.email, 'Email')} className="opacity-0 transition-opacity group-hover:opacity-100 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Copiar email">
                                <Copy size={14} />
                              </button>
                            </div>
                            {contact.ig.trim() ? (
                              <div className="group flex items-center gap-1">
                                <a href={`https://instagram.com/${contact.ig.replace('@', '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                                  <Instagram size={16} /> {contact.ig}
                                </a>
                                <button type="button" onClick={() => handleCopy(contact.ig, 'Usuario de Instagram')} className="opacity-0 transition-opacity group-hover:opacity-100 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Copiar Instagram">
                                  <Copy size={14} />
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                          <IconButton icon={PencilLine} label={`Editar contacto ${contact.name}`} onClick={() => setEditingContact({ partnerId: activePartner.id, contact })} className="h-10 w-10 rounded-[0.8rem] bg-[var(--surface-muted)] text-[var(--text-secondary)]" />
                          <IconButton
                            icon={Trash2}
                            label={`Eliminar contacto ${contact.name}`}
                            onClick={() => setContactPendingDeletion({ partnerId: activePartner.id, contact })}
                            tone="danger"
                            className="h-10 w-10 rounded-[0.8rem]"
                          />
                          <IconButton icon={Send} label={`Redactar mensaje para ${contact.name}`} onClick={() => setComposingTo({ contact, partner: activePartner })} tone="primary" accentColor={accentColor} className="h-10 w-10 rounded-[0.8rem]" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title="Aún no hay contactos"
                    description="Añade el primer contacto para empezar a redactar mensajes y hacer seguimiento."
                    action={
                      <Button accentColor={accentColor} onClick={() => setAddingContactTo(activePartner.id)}>
                        <Plus size={16} />
                        Añadir contacto
                      </Button>
                    }
                  />
                )}
              </div>
              </div>
            </SurfaceCard>
          ) : (
            <SurfaceCard className="p-5 sm:p-6">
              <EmptyState icon={Building2} title="Selecciona una marca" description="Usa la lista de la izquierda para abrir el detalle de un partner." />
            </SurfaceCard>
          )}
        </div>
      </div>

      {contactPendingDeletion ? (
        <ConfirmDialog
          title="Eliminar contacto"
          description={`Se eliminará a ${contactPendingDeletion.contact.name} del directorio de ${activePartner?.name || 'esta marca'}.`}
          confirmLabel="Eliminar"
          onConfirm={() => void handleDeleteContact()}
          onClose={() => setContactPendingDeletion(null)}
        />
      ) : null}

      {isAddingPartner && (
        <OverlayModal tone="slate" onClose={() => setIsAddingPartner(false)}>
          <ModalPanel title="Nueva marca" description="Añade un partner para empezar a ordenar contactos y conversaciones." onClose={() => setIsAddingPartner(false)} size="sm">
            <form onSubmit={handleAddPartner} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <Building2 size={14} />
                    Nombre
                  </label>
                  <input required value={newPartner.name} onChange={(event) => setNewPartner({ ...newPartner, name: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="Ej. Nike, Samsung, Zara" />
                </div>
              </div>
              <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
                <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                  Detalles Operativos
                </h4>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <Activity size={14} />
                    Estado
                  </label>
                  <CustomSelect
                    value={newPartner.status}
                    onChange={(val) => setNewPartner({ ...newPartner, status: val as Partner['status'] })}
                    options={PARTNER_STATUSES.map(s => ({ value: s, label: statusLabel(s) }))}
                    buttonStyle={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    buttonClassName="font-medium bg-[var(--surface-card)]"
                  />
                </div>
              </div>
              <Button type="submit" accentColor={accentColor} className="w-full">Crear marca</Button>
            </form>
          </ModalPanel>
        </OverlayModal>
      )}

      {composingTo && (
        <OverlayModal tone="slate" onClose={closeComposer}>
          <ModalPanel title={`Mensaje para ${composingTo.contact.name}`} description={composingTo.partner.name} onClose={closeComposer} size="lg">
            <div className="space-y-6">
              <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <MessageSquare size={14} />
                    Usar plantilla
                  </label>
                  <CustomSelect
                    value={selectedTemplateId}
                    onChange={handleTemplateSelect}
                    options={[
                      { value: '', label: 'Selecciona una plantilla' },
                      ...templates.map((t) => ({ value: t.id, label: t.name }))
                    ]}
                    buttonStyle={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    buttonClassName="font-medium bg-[var(--surface-card)]"
                  />
                </div>
              </div>

              {selectedTemplateId ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Type size={14} />
                      Asunto
                    </label>
                    <input value={messagePreview.subject} onChange={(event) => setMessagePreview({ ...messagePreview, subject: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <AlignLeft size={14} />
                      Mensaje
                    </label>
                    <textarea value={messagePreview.body} onChange={(event) => setMessagePreview({ ...messagePreview, body: event.target.value })} className={cx(fieldClass, 'min-h-[180px]')} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} />
                  </div>
                  <Button onClick={handleSend} accentColor={accentColor} className="w-full">
                    <Send size={18} />
                    Abrir en correo
                  </Button>
                </div>
              ) : (
                <EmptyState icon={MessageSquare} title="Elige una plantilla" description="Selecciona una plantilla para previsualizar asunto y mensaje antes de abrir el correo." className="border-dashed" />
              )}
            </div>
          </ModalPanel>
        </OverlayModal>
      )}

      {addingContactTo && (
        <OverlayModal tone="slate" onClose={() => setAddingContactTo(null)}>
          <ModalPanel title="Nuevo contacto" description="Guarda la persona clave para esta marca." onClose={() => setAddingContactTo(null)} size="sm">
            <form onSubmit={handleAddContact} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <Type size={14} />
                    Nombre
                  </label>
                  <input required value={newContact.name} onChange={(event) => setNewContact({ ...newContact, name: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="Juan Perez" />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <Briefcase size={14} />
                    Rol
                  </label>
                  <input required value={newContact.role} onChange={(event) => setNewContact({ ...newContact, role: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="PR Manager" />
                </div>
              </div>
              <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
                <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                  Medios de contacto
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Mail size={14} />
                      Email
                    </label>
                    <input type="email" required value={newContact.email} onChange={(event) => setNewContact({ ...newContact, email: event.target.value })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="juan@brand.com" />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Instagram size={14} />
                      Instagram
                    </label>
                    <input value={newContact.ig} onChange={(event) => setNewContact({ ...newContact, ig: event.target.value })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="@juanperez" />
                  </div>
                </div>
              </div>
              <Button type="submit" accentColor={accentColor} className="w-full">Guardar contacto</Button>
            </form>
          </ModalPanel>
        </OverlayModal>
      )}

      {editingContact && (
        <OverlayModal tone="slate" onClose={() => setEditingContact(null)}>
          <ModalPanel title="Editar contacto" description="Ajusta nombre, rol y medios de contacto." onClose={() => setEditingContact(null)} size="sm">
            <form onSubmit={handleEditContact} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <Type size={14} />
                    Nombre
                  </label>
                  <input required value={editingContact.contact.name} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, name: event.target.value } })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="Juan Perez" />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <Briefcase size={14} />
                    Rol
                  </label>
                  <input required value={editingContact.contact.role} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, role: event.target.value } })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="PR Manager" />
                </div>
              </div>
              <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
                <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                  Medios de contacto
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Mail size={14} />
                      Email
                    </label>
                    <input required type="email" value={editingContact.contact.email} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, email: event.target.value } })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="juan@example.com" />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Instagram size={14} />
                      Instagram
                    </label>
                    <input required value={editingContact.contact.ig} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, ig: event.target.value } })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="@juanperez" />
                  </div>
                </div>
              </div>
              <Button type="submit" accentColor={accentColor} className="w-full">Guardar cambios</Button>
            </form>
          </ModalPanel>
        </OverlayModal>
      )}
    </div>
  );
}
