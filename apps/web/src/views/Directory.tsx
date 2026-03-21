import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Building2,
  Mail,
  Instagram,
  Search,
  Send,
  Plus,
  PencilLine,
  Trash2,
  ChevronDown,
  MessageSquare,
  Users,
} from 'lucide-react';
import { Contact, Partner } from '@shared/domain';
import ConfirmDialog from '../components/ConfirmDialog';
import OverlayModal from '../components/OverlayModal';
import {
  Button,
  EmptyState,
  IconButton,
  MetricCard,
  ModalPanel,
  StatusBadge,
  SurfaceCard,
  cx,
} from '../components/ui';

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
  'w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:bg-slate-800';
const selectClass =
  'appearance-none rounded-[1rem] border border-slate-200 bg-white/85 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100';
const modalClass =
  'bg-white dark:bg-slate-800 w-full sm:w-[90%] sm:rounded-[1.35rem] rounded-t-[1.5rem] p-6 sm:p-8 shadow-2xl';

const statusLabel = (status: Partner['status']) => STATUS_LABELS[status] ?? status;
const statusTone = (status: Partner['status']) => STATUS_TONES[status] ?? 'neutral';

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

  const activePartnerTasks = useMemo(() => {
    if (!activePartner) return [];
    return tasks.filter((task) => task.partnerId === activePartner.id);
  }, [activePartner, tasks]);

  const openTasks = activePartnerTasks.filter((task) => task.status !== 'Cobro');
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

    const partnerTasks = tasks.filter((task) => task.partnerId === composingTo.partner.id && task.status !== 'Cobro');
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
  };

  const handleAddContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addingContactTo) return;
    await addContact(addingContactTo, newContact);
    setAddingContactTo(null);
    setNewContact({ name: '', role: '', email: '', ig: '' });
  };

  const handleEditContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingContact) return;
    await updateContact(editingContact.partnerId, editingContact.contact.id, editingContact.contact);
    setEditingContact(null);
  };

  const handleDeleteContact = async () => {
    if (!contactPendingDeletion) return;

    await deleteContact(contactPendingDeletion.partnerId, contactPendingDeletion.contact.id);
    setContactPendingDeletion(null);
  };

  return (
    <div className="flex flex-col space-y-6 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:px-8 lg:pt-4 lg:pb-8">
      <div className="lg:hidden flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
            Relaciones comerciales
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Directorio
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Centraliza marcas, contactos y mensajes para mover conversaciones sin perder contexto.
          </p>
        </div>
        <Button accentColor={accentColor} onClick={() => setIsAddingPartner(true)} className="shrink-0 px-4">
          <Plus size={16} />
          Añadir
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard icon={Building2} label="Marcas" value={String(partners.length)} helper="Partners guardados en el workspace" accentColor={accentColor} />
            <MetricCard icon={Users} label="Activos" value={String(activePartners)} helper="Marcas con estado activo" accentColor={accentColor} />
            <MetricCard icon={Mail} label="Contactos" value={String(totalContacts)} helper="Contactos disponibles para outreach" accentColor={accentColor} className="sm:col-span-2 xl:col-span-1" />
          </div>

          <SurfaceCard className="p-4 sm:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Buscar marcas o contactos"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-[1.2rem] border border-white/70 bg-white/85 py-4 pl-14 pr-5 text-[15px] font-medium text-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 dark:border-slate-700/60 dark:bg-slate-900/55 dark:text-slate-100"
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between px-2 pt-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Lista</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Marcas y contactos</h2>
              </div>
              <StatusBadge tone="neutral">{filteredPartners.length} resultados</StatusBadge>
            </div>

            <div className="space-y-2">
              {filteredPartners.map((partner) => {
                const isActive = activePartner?.id === partner.id;
                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={cx(
                      'w-full rounded-[1rem] border px-4 py-4 text-left transition-all',
                      isActive
                        ? 'border-slate-200/80 text-slate-900 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.2)] dark:border-slate-700/60 dark:text-slate-100'
                        : 'border-slate-100 bg-white/80 text-slate-900 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-800/70',
                    )}
                    style={isActive ? { backgroundColor: `${accentColor}10` } : undefined}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className={cx('flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black', isActive ? 'bg-white/85 text-slate-900 dark:bg-slate-900/55 dark:text-slate-100' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
                            <Building2 size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold leading-tight">{partner.name}</h3>
                            <p className={cx('mt-1 text-xs font-medium', isActive ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400')}>
                              {partner.contacts.length} contactos
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <StatusBadge tone={statusTone(partner.status)}>{statusLabel(partner.status)}</StatusBadge>
                        <ChevronDown size={18} className={cx('transition-transform', isActive ? 'rotate-180 text-slate-500 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500')} />
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
          <SurfaceCard className="p-5 sm:p-6">
            {activePartner ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Detalle</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">{activePartner.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Gestiona estado, contactos y conversaciones sin salir de este panel.
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <StatusBadge tone={statusTone(activePartner.status)}>{statusLabel(activePartner.status)}</StatusBadge>
                    <select
                      value={activePartner.status}
                      onChange={(event) => void updatePartner(activePartner.id, { status: event.target.value as Partner['status'] })}
                      className={selectClass}
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      aria-label={`Cambiar estado de ${activePartner.name}`}
                    >
                      {PARTNER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status as Partner['status'])}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1rem] border border-slate-100 bg-slate-50/90 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Contactos</p>
                    <p className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{activePartner.contacts.length}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-100 bg-slate-50/90 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tareas</p>
                    <p className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{activePartnerTasks.length}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-100 bg-slate-50/90 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Abiertas</p>
                    <p className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{openTasks.length}</p>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState icon={Building2} title="Selecciona una marca" description="Usa la lista de la izquierda para abrir el detalle de un partner." />
            )}
          </SurfaceCard>

          {activePartner ? (
            <SurfaceCard className="p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Contactos</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Red de la marca</h3>
                </div>
                <Button accentColor={accentColor} onClick={() => setAddingContactTo(activePartner.id)}>
                  <Plus size={16} />
                  Añadir contacto
                </Button>
              </div>

              <div className="space-y-3">
                {activePartner.contacts.length > 0 ? (
                  activePartner.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="rounded-[1.1rem] border border-slate-100 bg-white/80 p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)] dark:border-slate-700/60 dark:bg-slate-900/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-slate-900 dark:text-slate-100">{contact.name}</p>
                          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{contact.role}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <IconButton icon={PencilLine} label={`Editar contacto ${contact.name}`} onClick={() => setEditingContact({ partnerId: activePartner.id, contact })} className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300" />
                          <IconButton
                            icon={Trash2}
                            label={`Eliminar contacto ${contact.name}`}
                            onClick={() => setContactPendingDeletion({ partnerId: activePartner.id, contact })}
                            tone="danger"
                          />
                          <IconButton icon={Send} label={`Redactar mensaje para ${contact.name}`} onClick={() => setComposingTo({ contact, partner: activePartner })} tone="primary" accentColor={accentColor} />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-700/60">
                        <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                          <Mail size={16} /> Email
                        </a>
                        {contact.ig.trim() ? (
                          <a href={`https://instagram.com/${contact.ig.replace('@', '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                            <Instagram size={16} /> {contact.ig}
                          </a>
                        ) : null}
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
            </SurfaceCard>
          ) : null}
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
            <form onSubmit={handleAddPartner} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Nombre</label>
                <input required value={newPartner.name} onChange={(event) => setNewPartner({ ...newPartner, name: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="Ej. Nike, Samsung, Zara" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Estado</label>
                <select value={newPartner.status} onChange={(event) => setNewPartner({ ...newPartner, status: event.target.value as Partner['status'] })} className={cx(fieldClass, 'appearance-none')} style={{ '--tw-ring-color': accentColor } as React.CSSProperties}>
                  {PARTNER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status as Partner['status'])}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" accentColor={accentColor} className="w-full">Crear marca</Button>
            </form>
          </ModalPanel>
        </OverlayModal>
      )}

      {composingTo && (
        <OverlayModal tone="slate" onClose={closeComposer}>
          <ModalPanel title={`Mensaje para ${composingTo.contact.name}`} description={composingTo.partner.name} onClose={closeComposer} size="lg">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Usar plantilla</label>
                <select value={selectedTemplateId} onChange={(event) => handleTemplateSelect(event.target.value)} className={cx(fieldClass, 'appearance-none')} style={{ '--tw-ring-color': accentColor } as React.CSSProperties}>
                  <option value="">Selecciona una plantilla</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplateId ? (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Asunto</label>
                    <input value={messagePreview.subject} onChange={(event) => setMessagePreview({ ...messagePreview, subject: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Mensaje</label>
                    <textarea value={messagePreview.body} onChange={(event) => setMessagePreview({ ...messagePreview, body: event.target.value })} className={cx(fieldClass, 'min-h-[180px]')} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} />
                  </div>
                  <Button onClick={handleSend} accentColor={accentColor} className="w-full">
                    <Send size={18} />
                    Abrir en correo
                  </Button>
                </>
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
            <form onSubmit={handleAddContact} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Nombre</label>
                <input required value={newContact.name} onChange={(event) => setNewContact({ ...newContact, name: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="Juan Perez" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Rol</label>
                <input required value={newContact.role} onChange={(event) => setNewContact({ ...newContact, role: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="PR Manager" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Email</label>
                <input type="email" required value={newContact.email} onChange={(event) => setNewContact({ ...newContact, email: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="juan@brand.com" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Instagram</label>
                <input value={newContact.ig} onChange={(event) => setNewContact({ ...newContact, ig: event.target.value })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="@juanperez" />
              </div>
              <Button type="submit" accentColor={accentColor} className="w-full">Guardar contacto</Button>
            </form>
          </ModalPanel>
        </OverlayModal>
      )}

      {editingContact && (
        <OverlayModal tone="slate" onClose={() => setEditingContact(null)}>
          <ModalPanel title="Editar contacto" description="Ajusta nombre, rol y medios de contacto." onClose={() => setEditingContact(null)} size="sm">
            <form onSubmit={handleEditContact} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Nombre</label>
                <input required value={editingContact.contact.name} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, name: event.target.value } })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="Juan Perez" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Rol</label>
                <input required value={editingContact.contact.role} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, role: event.target.value } })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="PR Manager" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Email</label>
                <input required type="email" value={editingContact.contact.email} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, email: event.target.value } })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="juan@example.com" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Instagram</label>
                <input required value={editingContact.contact.ig} onChange={(event) => setEditingContact({ ...editingContact, contact: { ...editingContact.contact, ig: event.target.value } })} className={fieldClass} style={{ '--tw-ring-color': accentColor } as React.CSSProperties} placeholder="@juanperez" />
              </div>
              <Button type="submit" accentColor={accentColor} className="w-full">Guardar cambios</Button>
            </form>
          </ModalPanel>
        </OverlayModal>
      )}
    </div>
  );
}
