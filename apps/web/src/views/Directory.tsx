import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Pulse,
  TextAlignLeft,
  Briefcase,
  Buildings,
  CalendarDots,
  CaretDown,
  CurrencyCircleDollar,
  Copy,
  FileText,
  InstagramLogo,
  Stack,
  Envelope,
  ChatCircle,
  Chat,
  PencilLine,
  Phone,
  Plus,
  MagnifyingGlass,
  Trash,
  TextT,
} from '@phosphor-icons/react';
import { Contact, Partner, PartnershipType, TaskStatus } from '@shared/domain';
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

const PHONE_PREFIXES = [
  { value: '+34', label: '🇪🇸 +34' },
  { value: '+1', label: '🇺🇸 +1' },
  { value: '+58', label: '🇻🇪 +58' },
];

const PARTNERSHIP_TYPES: PartnershipType[] = ['Permanente', 'Plazo Fijo', 'One Time', 'Por definir'];

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
  'w-full rounded-[1rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3 text-base sm:text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2';

const statusLabel = (status: Partner['status']) => STATUS_LABELS[status] ?? status;
const statusTone = (status: Partner['status']) => STATUS_TONES[status] ?? 'neutral';
const taskStatusTone = (
  status: TaskStatus,
): React.ComponentProps<typeof StatusBadge>['tone'] => {
  if (status === 'Pendiente') return 'warning';
  if (status === 'En Progreso') return 'info';
  if (status === 'En Revisión') return 'review';
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
    accentHex,
    accentGradient,
    templates,
    profile,
    addContact,
    updateContact,
    deleteContact,
    updatePartner,
    addPartner,
    tasks,
  } = useAppContext();
  const [search, setMagnifyingGlass] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(partners[0]?.id ?? null);
  const [composingTo, setComposingTo] = useState<{ contact: Contact; partner: Partner } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messagePreview, setMessagePreview] = useState({ body: '' });
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [addingContactTo, setAddingContactTo] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<{ partnerId: string; contact: Contact; prefix: string; number: string } | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);
  const [contactPendingDeletion, setContactPendingDeletion] = useState<{
    partnerId: string;
    contact: Contact;
  } | null>(null);
  const [newPartner, setNewPartner] = useState({
    name: '',
    status: 'Prospecto' as Partner['status'],
    partnershipType: 'Por definir' as PartnershipType,
    keyTerms: '',
    startDate: '',
    endDate: '',
    monthlyRevenue: '',
    annualRevenue: '',
    mainChannel: '',
  });
  const [newContact, setNewContact] = useState({ name: '', role: '', email: '', ig: '', phonePrefix: '+34', phoneNumber: '' });

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
          const openPartnerTasks = partnerTasks.filter((task) => task.status !== 'Cobrado');
          accumulator[partner.id] = {
            total: partnerTasks.length,
            open: openPartnerTasks.length,
            openValue: openPartnerTasks.reduce((sum, task) => sum + task.value, 0),
          };
          return accumulator;
        },
        {} as Record<string, { total: number; open: number; openValue: number }>,
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
    setMessagePreview({ body: '' });
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (!template || !composingTo) {
      setMessagePreview({ body: '' });
      return;
    }

    const partnerTasks = tasks.filter((task) => task.partnerId === composingTo.partner.id && task.status !== 'Cobrado');
    const relevantTask = partnerTasks.length > 0 ? partnerTasks[0] : null;
    const deliverable = relevantTask ? `${relevantTask.title} (${relevantTask.description})` : '[Entregable no especificado]';
    const mediaKitLink = `https://tia.app/${profile.handle.replace('@', '')}`;
    const replaceVars = (text: string) =>
      text
        .replace(/{{brandName}}/g, composingTo.partner.name)
        .replace(/{{contactName}}/g, composingTo.contact.name.split(' ')[0])
        .replace(/{{creatorName}}/g, profile.name)
        .replace(/{{deliverable}}/g, deliverable)
        .replace(/{{mediaKitLink}}/g, mediaKitLink);

    setMessagePreview({
      body: replaceVars(template.body),
    });
  };

  const handleSendEmail = () => {
    if (!composingTo) return;
    const subject = `Contacto con ${composingTo.partner.name}`;
    const mailto = `mailto:${composingTo.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messagePreview.body)}`;
    window.open(mailto, '_blank');
    closeComposer();
  };

  const handleSendWhatsApp = () => {
    if (!composingTo) return;
    const phone = composingTo.contact.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Este contacto no tiene un número de WhatsApp guardado.');
      return;
    }
    const text = messagePreview.body;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    closeComposer();
  };

  const handleAddPartner = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const name = newPartner.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      const partnerId = await addPartner({
        name,
        status: newPartner.status,
        partnershipType: newPartner.partnershipType,
        keyTerms: newPartner.keyTerms,
        startDate: newPartner.startDate,
        endDate: newPartner.endDate,
        monthlyRevenue: Number(newPartner.monthlyRevenue) || 0,
        annualRevenue: Number(newPartner.annualRevenue) || 0,
        mainChannel: newPartner.mainChannel,
        contacts: [],
      } as any);
      setSelectedPartnerId(partnerId);
      setIsAddingPartner(false);
      setNewPartner({ name: '', status: 'Prospecto', partnershipType: 'Por definir', keyTerms: '', startDate: '', endDate: '', monthlyRevenue: '', annualRevenue: '', mainChannel: '' });
      toast.success(`Marca ${name} añadida al directorio`);
    } finally { setSaving(false); }
  };

  const handleEditPartner = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !editingPartner) return;
    setSaving(true);
    try {
      await updatePartner(editingPartner.id, {
        name: editingPartner.name,
        partnershipType: editingPartner.partnershipType,
        keyTerms: editingPartner.keyTerms,
        startDate: editingPartner.startDate,
        endDate: editingPartner.endDate,
        monthlyRevenue: Number(editingPartner.monthlyRevenue) || 0,
        annualRevenue: Number(editingPartner.annualRevenue) || 0,
        mainChannel: editingPartner.mainChannel,
      } as any);
      setEditingPartner(null);
      toast.success('Marca actualizada');
    } finally { setSaving(false); }
  };

  const handleAddContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !addingContactTo) return;
    setSaving(true);
    try {
      const finalPhone = newContact.phoneNumber.trim() ? `${newContact.phonePrefix} ${newContact.phoneNumber.trim()}` : '';
      await addContact(addingContactTo, { ...newContact, phone: finalPhone });
      setAddingContactTo(null);
      setNewContact({ name: '', role: '', email: '', ig: '', phonePrefix: '+34', phoneNumber: '' });
      toast.success('Contacto guardado');
    } finally { setSaving(false); }
  };

  const handleOpenEditContact = (partnerId: string, contact: Contact) => {
    let prefix = '+34';
    let number = contact.phone || '';
    const match = number.match(/^(\+\d+)\s+(.*)$/);
    if (match) {
      prefix = match[1];
      number = match[2];
    } else if (number.startsWith('+34')) {
      prefix = '+34'; number = number.replace('+34', '').trim();
    } else if (number.startsWith('+1')) {
      prefix = '+1'; number = number.replace('+1', '').trim();
    } else if (number.startsWith('+58')) {
      prefix = '+58'; number = number.replace('+58', '').trim();
    }
    setEditingContact({ partnerId, contact, prefix, number });
  };

  const handleEditContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !editingContact) return;
    setSaving(true);
    try {
      const finalPhone = editingContact.number.trim() ? `${editingContact.prefix} ${editingContact.number.trim()}` : '';
      await updateContact(editingContact.partnerId, editingContact.contact.id, { ...editingContact.contact, phone: finalPhone });
      setEditingContact(null);
      toast.success('Contacto actualizado');
    } finally { setSaving(false); }
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
              { icon: Buildings, label: 'Marcas', value: `${activePartners} / ${partners.length}` },
              { icon: Envelope, label: 'Contactos', value: String(totalContacts) },
            ].map((item) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-3 px-3 py-2"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${accentHex}14`, color: accentHex }}
                >
                  <item.icon size={15} />
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

          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={20} />
            <input
              type="text"
              placeholder="Buscar marcas o contactos"
              value={search}
              onChange={(event) => setMagnifyingGlass(event.target.value)}
              className={cx(fieldClass, 'py-4 pl-14 pr-5 text-base sm:text-[15px]')}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
            />
          </div>

          <SurfaceCard className="p-3 sm:p-4">
            <div className="mb-3 px-2 pt-1">
              <Button accentColor={accentGradient} onClick={() => setIsAddingPartner(true)} className="w-full py-2.5 text-xs">
                <Plus size={14} weight="regular" />
                Añadir
              </Button>
            </div>

            <div className="space-y-2">
              {filteredPartners.map((partner) => {
                const isActive = activePartner?.id === partner.id;
                const meta = partnerTaskMeta[partner.id] ?? { total: 0, open: 0, openValue: 0 };
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
                            <Buildings size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold leading-tight text-[var(--text-primary)]">{partner.name}</h3>
                            <p className={cx('mt-1 text-xs font-medium', isActive ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]')}>
                              {partner.contacts.length} contactos · {meta.open} abiertas · {formatCurrency(meta.openValue)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <StatusBadge tone={statusTone(partner.status)}>{statusLabel(partner.status)}</StatusBadge>
                        <CaretDown size={18} className={cx('transition-transform', isActive ? 'rotate-180 text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]/80')} />
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredPartners.length === 0 && (
                <EmptyState
                  icon={Buildings}
                  title="No hay resultados"
                  description="Prueba con otro termino o crea una nueva marca para empezar."
                  className="border-dashed"
                  action={
                    <Button accentColor={accentGradient} onClick={() => setIsAddingPartner(true)}>
                      <Plus size={16} weight="regular" />
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
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{activePartner.name}</h2>
                      <IconButton
                        icon={PencilLine}
                        label={`Editar ${activePartner.name}`}
                        onClick={() => setEditingPartner(activePartner)}
                        tone="ghost"
                        className="h-8 w-8 rounded-[0.6rem]"
                        iconSize={16}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge tone={statusTone(activePartner.status)}>{statusLabel(activePartner.status)}</StatusBadge>
                      {nextDueTask ? <StatusBadge tone="neutral">{formatTaskDate(nextDueTask.dueDate)}</StatusBadge> : null}
                    </div>
                  </div>

                  <CustomSelect
                    value={activePartner.status}
                    onChange={(val) => void updatePartner(activePartner.id, { status: val as Partner['status'] })}
                    options={PARTNER_STATUSES.map(s => ({ value: s, label: statusLabel(s) }))}
                    buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    ariaLabel={`Cambiar estado de ${activePartner.name}`}
                    className="w-full sm:w-auto sm:min-w-[180px]"
                    buttonClassName="shadow-sm"
                  />
                </div>

                <div className="mt-8">
                  <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                    Acuerdo Comercial
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]/80">Tipo</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{activePartner.partnershipType || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]/80">Canal</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{activePartner.mainChannel || '-'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]/80">
                        {activePartner.partnershipType === 'One Time' ? 'Fecha' : activePartner.partnershipType === 'Permanente' ? 'Desde' : 'Fechas'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                        {activePartner.partnershipType === 'One Time'
                          ? (activePartner.startDate ? formatTaskDate(activePartner.startDate) : '-')
                          : activePartner.partnershipType === 'Permanente'
                            ? (activePartner.startDate ? formatTaskDate(activePartner.startDate) : '-')
                            : activePartner.partnershipType === 'Plazo Fijo'
                              ? `${activePartner.startDate ? formatTaskDate(activePartner.startDate) : '-'} al ${activePartner.endDate ? formatTaskDate(activePartner.endDate) : '-'}`
                              : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]/80">Rev Mensual</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{activePartner.monthlyRevenue ? formatCurrency(activePartner.monthlyRevenue) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]/80">Rev Anual</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{activePartner.annualRevenue ? formatCurrency(activePartner.annualRevenue) : '-'}</p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4 mt-2 border-t border-[color:var(--line-soft)] pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]/80">Condiciones del acuerdo</p>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{activePartner.keyTerms || 'Aún no se han definido condiciones.'}</p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="border-t border-[color:var(--line-soft)] bg-[var(--surface-muted)]/50 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Próximos deliverables</h3>
                  <span className="hidden text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70 sm:inline-block">Pipeline abierto</span>
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
                    icon={CalendarDots}
                    title="Sin tareas abiertas"
                    description="Esta marca no tiene entregables activos ahora mismo."
                    className="py-10"
                  />
                )}
              </div>
              </div>

              <div className="border-t border-[color:var(--line-soft)] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Red de la marca</h3>
                  <span className="hidden text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70 sm:inline-block">Contactos</span>
                </div>
                <Button accentColor={accentGradient} onClick={() => setAddingContactTo(activePartner.id)}>
                  <Plus size={16} weight="regular" />
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
                                <Envelope size={16} /> {contact.email}
                              </a>
                              <button type="button" onClick={() => handleCopy(contact.email, 'Email')} className="opacity-0 transition-opacity group-hover:opacity-100 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Copiar email">
                                <Copy size={14} />
                              </button>
                            </div>
                            {contact.ig.trim() ? (
                              <div className="group flex items-center gap-1">
                                <a href={`https://instagram.com/${contact.ig.replace('@', '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                                  <InstagramLogo size={16} /> {contact.ig}
                                </a>
                                <button type="button" onClick={() => handleCopy(contact.ig, 'Usuario de InstagramLogo')} className="opacity-0 transition-opacity group-hover:opacity-100 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Copiar InstagramLogo">
                                  <Copy size={14} />
                                </button>
                              </div>
                            ) : null}
                            {contact.phone?.trim() ? (
                              <div className="group flex items-center gap-1">
                                <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                                  <Phone size={16} /> {contact.phone}
                                </a>
                                <button type="button" onClick={() => handleCopy(contact.phone || '', 'Teléfono')} className="opacity-0 transition-opacity group-hover:opacity-100 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Copiar teléfono">
                                  <Copy size={14} />
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                          <IconButton icon={PencilLine} label={`Editar contacto ${contact.name}`} onClick={() => handleOpenEditContact(activePartner.id, contact)} className="h-10 w-10 rounded-[0.8rem] bg-[var(--surface-muted)] text-[var(--text-secondary)]" />
                          <IconButton icon={ChatCircle} label={`Redactar WhatsApp para ${contact.name}`} onClick={() => setComposingTo({ contact, partner: activePartner })} tone="primary" accentColor={accentGradient} className="h-10 w-10 rounded-[0.8rem] border-none" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Chat}
                    title="Aún no hay contactos"
                    description="Añade el primer contacto para empezar a redactar mensajes y hacer seguimiento."
                    action={
                      <Button accentColor={accentGradient} onClick={() => setAddingContactTo(activePartner.id)}>
                        <Plus size={16} weight="regular" />
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
              <EmptyState icon={Buildings} title="Selecciona una marca" description="Usa la lista de la izquierda para abrir el detalle de un partner." />
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

      {editingPartner && (
        <OverlayModal tone="slate" onClose={() => setEditingPartner(null)}>
          <ModalPanel title="Editar marca" description="Modifica los detalles del acuerdo comercial de esta marca." onClose={() => setEditingPartner(null)} size="lg">
            <form onSubmit={handleEditPartner} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Buildings size={14} />
                      Nombre
                    </label>
                    <input required value={editingPartner.name} onChange={(event) => setEditingPartner({ ...editingPartner, name: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Stack size={14} />
                      Canal Principal
                    </label>
                    <input value={editingPartner.mainChannel || ''} onChange={(event) => setEditingPartner({ ...editingPartner, mainChannel: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <FileText size={14} />
                      Condiciones del acuerdo
                    </label>
                    <textarea value={editingPartner.keyTerms || ''} onChange={(event) => setEditingPartner({ ...editingPartner, keyTerms: event.target.value })} className={cx(fieldClass, 'min-h-[118px]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="Ej. 4 Historias/mes, 1 Reel" />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
                  <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                    Detalles Operativos
                  </h4>
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                        <Pulse size={14} />
                        Tipo de Partnership
                      </label>
                      <CustomSelect value={editingPartner.partnershipType || 'Por definir'} onChange={(val) => {
                        const pt = val as PartnershipType;
                        setEditingPartner({
                          ...editingPartner,
                          partnershipType: pt,
                          startDate: pt === 'Por definir' ? '' : editingPartner.startDate,
                          endDate: pt === 'Plazo Fijo' ? editingPartner.endDate : '',
                        });
                      }} options={PARTNERSHIP_TYPES.map(s => ({ value: s, label: s }))} buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties} buttonClassName="font-medium bg-[var(--surface-card)]" />
                    </div>
                    {(editingPartner.partnershipType || 'Por definir') !== 'Por definir' && (
                      <div className={cx('grid min-w-0 gap-4', ((editingPartner.partnershipType || 'Por definir') === 'Permanente' || (editingPartner.partnershipType || 'Por definir') === 'One Time') ? 'grid-cols-1' : 'grid-cols-2')}>
                        <div className="min-w-0">
                          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                            <CalendarDots size={14} />
                            {(editingPartner.partnershipType || 'Por definir') === 'One Time' ? 'Fecha' : 'Inicio'}
                          </label>
                          <input type="date" value={editingPartner.startDate || ''} onChange={(event) => setEditingPartner({ ...editingPartner, startDate: event.target.value })} className={cx(fieldClass, 'min-w-0 bg-[var(--surface-card)] px-3')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} />
                        </div>
                        {(editingPartner.partnershipType || 'Por definir') === 'Plazo Fijo' && (
                          <div className="min-w-0">
                            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                              <CalendarDots size={14} />
                              Fin
                            </label>
                            <input type="date" value={editingPartner.endDate || ''} onChange={(event) => setEditingPartner({ ...editingPartner, endDate: event.target.value })} className={cx(fieldClass, 'min-w-0 bg-[var(--surface-card)] px-3')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                          <CurrencyCircleDollar size={14} />
                          Mensual
                        </label>
                        <input type="number" value={editingPartner.monthlyRevenue || ''} onChange={(event) => setEditingPartner({ ...editingPartner, monthlyRevenue: Number(event.target.value) })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="1200" />
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                          <CurrencyCircleDollar size={14} />
                          Anual
                        </label>
                        <input type="number" value={editingPartner.annualRevenue || ''} onChange={(event) => setEditingPartner({ ...editingPartner, annualRevenue: Number(event.target.value) })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="14400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button type="submit" accentColor={accentGradient} className="w-full" disabled={saving}>Guardar cambios</Button>
            </form>
          </ModalPanel>
        </OverlayModal>
      )}

      {isAddingPartner && (
        <OverlayModal tone="slate" onClose={() => setIsAddingPartner(false)}>
          <ModalPanel title="Nueva marca" description="Añade un partner e ingresa su acuerdo comercial." onClose={() => setIsAddingPartner(false)} size="lg">
            <form onSubmit={handleAddPartner} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Buildings size={14} />
                      Nombre
                    </label>
                    <input required value={newPartner.name} onChange={(event) => setNewPartner({ ...newPartner, name: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Stack size={14} />
                      Canal Principal
                    </label>
                    <input value={newPartner.mainChannel} onChange={(event) => setNewPartner({ ...newPartner, mainChannel: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <FileText size={14} />
                      Condiciones del acuerdo
                    </label>
                    <textarea value={newPartner.keyTerms} onChange={(event) => setNewPartner({ ...newPartner, keyTerms: event.target.value })} className={cx(fieldClass, 'min-h-[118px]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="Ej. 4 Historias/mes, 1 Reel" />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                      Detalles Operativos
                    </h4>
                    <CustomSelect value={newPartner.status} onChange={(val) => setNewPartner({ ...newPartner, status: val as Partner['status'] })} options={PARTNER_STATUSES.map(s => ({ value: s, label: statusLabel(s) }))} buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties} buttonClassName="py-1 px-3 text-xs bg-[var(--surface-card)]" />
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                        <Pulse size={14} />
                        Tipo de Partnership
                      </label>
                      <CustomSelect value={newPartner.partnershipType} onChange={(val) => {
                        const pt = val as PartnershipType;
                        setNewPartner({
                          ...newPartner,
                          partnershipType: pt,
                          startDate: pt === 'Por definir' ? '' : newPartner.startDate,
                          endDate: pt === 'Plazo Fijo' ? newPartner.endDate : '',
                        });
                      }} options={PARTNERSHIP_TYPES.map(s => ({ value: s, label: s }))} buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties} buttonClassName="font-medium bg-[var(--surface-card)]" />
                    </div>
                    {newPartner.partnershipType !== 'Por definir' && (
                      <div className={cx('grid min-w-0 gap-4', (newPartner.partnershipType === 'Permanente' || newPartner.partnershipType === 'One Time') ? 'grid-cols-1' : 'grid-cols-2')}>
                        <div className="min-w-0">
                          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                            <CalendarDots size={14} />
                            {newPartner.partnershipType === 'One Time' ? 'Fecha' : 'Inicio'}
                          </label>
                          <input type="date" value={newPartner.startDate} onChange={(event) => setNewPartner({ ...newPartner, startDate: event.target.value })} className={cx(fieldClass, 'min-w-0 bg-[var(--surface-card)] px-3')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} />
                        </div>
                        {newPartner.partnershipType === 'Plazo Fijo' && (
                          <div className="min-w-0">
                            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                              <CalendarDots size={14} />
                              Fin
                            </label>
                            <input type="date" value={newPartner.endDate} onChange={(event) => setNewPartner({ ...newPartner, endDate: event.target.value })} className={cx(fieldClass, 'min-w-0 bg-[var(--surface-card)] px-3')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                          <CurrencyCircleDollar size={14} />
                          Mensual
                        </label>
                        <input type="number" value={newPartner.monthlyRevenue} onChange={(event) => setNewPartner({ ...newPartner, monthlyRevenue: event.target.value })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="1200" />
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                          <CurrencyCircleDollar size={14} />
                          Anual
                        </label>
                        <input type="number" value={newPartner.annualRevenue} onChange={(event) => setNewPartner({ ...newPartner, annualRevenue: event.target.value })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="14400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button type="submit" accentColor={accentGradient} className="w-full" disabled={saving}>Crear marca</Button>
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
                    <Chat size={14} />
                    Usar plantilla
                  </label>
                  <CustomSelect
                    value={selectedTemplateId}
                    onChange={handleTemplateSelect}
                    options={[
                      { value: '', label: 'Mensaje libre (Sin plantilla)' },
                      ...templates.map((t) => ({ value: t.id, label: t.name }))
                    ]}
                    buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    buttonClassName="font-medium bg-[var(--surface-card)]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <TextAlignLeft size={14} />
                    Mensaje
                  </label>
                  <textarea value={messagePreview.body} onChange={(event) => setMessagePreview({ ...messagePreview, body: event.target.value })} className={cx(fieldClass, 'min-h-[180px]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="Escribe tu mensaje aquí..." />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <ChatCircle size={18} />
                    Enviar por WhatsApp
                  </button>
                  <Button onClick={handleSendEmail} tone="secondary" className="flex-1 justify-center">
                    <Envelope size={18} />
                    Enviar por Correo
                  </Button>
                </div>
              </div>
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
                    <TextT size={14} />
                    Nombre
                  </label>
                  <input required value={newContact.name} onChange={(event) => setNewContact({ ...newContact, name: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <Briefcase size={14} />
                    Rol
                  </label>
                  <input required value={newContact.role} onChange={(event) => setNewContact({ ...newContact, role: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                </div>
              </div>
              <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
                <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                  Medios de contacto
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Envelope size={14} />
                      Email
                    </label>
                    <input type="email" required value={newContact.email} onChange={(event) => setNewContact({ ...newContact, email: event.target.value })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <InstagramLogo size={14} />
                      Instagram
                    </label>
                    <input value={newContact.ig} onChange={(event) => setNewContact({ ...newContact, ig: event.target.value })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Phone size={14} />
                      WhatsApp
                    </label>
                    <div className="flex items-center gap-2">
                      <CustomSelect
                        value={newContact.phonePrefix}
                        onChange={(val) => setNewContact({ ...newContact, phonePrefix: val })}
                        options={PHONE_PREFIXES}
                        buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                        className="!w-[100px] shrink-0"
                        buttonClassName="bg-[var(--surface-card)]"
                      />
                      <input type="tel" value={newContact.phoneNumber} onChange={(event) => setNewContact({ ...newContact, phoneNumber: event.target.value })} className={cx(fieldClass, 'flex-1 bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                    </div>
                  </div>
                </div>
              </div>
              <Button type="submit" accentColor={accentGradient} className="w-full" disabled={saving}>Guardar contacto</Button>
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
                    <TextT size={14} />
                    Nombre
                  </label>
                  <input required value={editingContact.contact.name} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, name: event.target.value } })} className={fieldClass} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                    <Briefcase size={14} />
                    Rol
                  </label>
                  <input required value={editingContact.contact.role} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, role: event.target.value } })} className={fieldClass} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                </div>
              </div>
              <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
                <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                  Medios de contacto
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Envelope size={14} />
                      Email
                    </label>
                    <input required type="email" value={editingContact.contact.email} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, email: event.target.value } })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <InstagramLogo size={14} />
                      InstagramLogo
                    </label>
                    <input required value={editingContact.contact.ig} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, ig: event.target.value } })} className={cx(fieldClass, 'bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]/70">
                      <Phone size={14} />
                      WhatsApp
                    </label>
                    <div className="flex items-center gap-2">
                      <CustomSelect
                        value={editingContact.prefix}
                        onChange={(val) => setEditingContact({ ...editingContact, prefix: val })}
                        options={PHONE_PREFIXES}
                        buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                        className="!w-[100px] shrink-0"
                        buttonClassName="bg-[var(--surface-card)]"
                      />
                      <input type="tel" value={editingContact.number} onChange={(event) => setEditingContact({ ...editingContact, number: event.target.value })} className={cx(fieldClass, 'flex-1 bg-[var(--surface-card)]')} style={{ '--tw-ring-color': accentHex } as React.CSSProperties} placeholder="" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  tone="danger"
                  onClick={() => {
                    setContactPendingDeletion({ partnerId: editingContact.partnerId, contact: editingContact.contact });
                    setEditingContact(null);
                  }}
                  className="px-4"
                  aria-label="Eliminar contacto"
                >
                  <Trash size={18} />
                </Button>
                <Button type="submit" accentColor={accentGradient} className="flex-1 justify-center" disabled={saving}>Guardar cambios</Button>
              </div>
            </form>
          </ModalPanel>
        </OverlayModal>
      )}
    </div>
  );
}
