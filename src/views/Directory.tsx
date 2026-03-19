import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Search, Plus, Building2, Mail, Instagram, ChevronDown, ChevronUp, Send, Edit2, Trash2 } from 'lucide-react';
import { Contact, Partner } from '../types';

export default function Directory() {
  const { partners, accentColor, templates, profile, addContact, updateContact, deleteContact, tasks } = useAppContext();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [composingTo, setComposingTo] = useState<{ contact: Contact, partner: Partner } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [messagePreview, setMessagePreview] = useState({ subject: '', body: '' });
  
  const [addingContactTo, setAddingContactTo] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<{ partnerId: string, contact: Contact } | null>(null);
  const [newContact, setNewContact] = useState({ name: '', role: '', email: '', ig: '' });

  const filteredPartners = partners.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Activo': return 'bg-emerald-100 text-emerald-700';
      case 'En Negociación': return 'bg-amber-100 text-amber-700';
      case 'On Hold': return 'bg-gray-100 text-gray-700';
      case 'Relación Culminada': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && composingTo) {
      // Find the most relevant task for this partner (e.g., first one not completed)
      const partnerTasks = tasks.filter(t => t.partnerId === composingTo.partner.id && t.status !== 'Cobro');
      const relevantTask = partnerTasks.length > 0 ? partnerTasks[0] : null;
      const deliverableText = relevantTask ? `${relevantTask.title} (${relevantTask.description})` : '[Entregable no especificado]';

      const replaceVars = (text: string) => {
        return text
          .replace(/{{brandName}}/g, composingTo.partner.name)
          .replace(/{{contactName}}/g, composingTo.contact.name.split(' ')[0])
          .replace(/{{creatorName}}/g, profile.name)
          .replace(/{{deliverable}}/g, deliverableText);
      };
      setMessagePreview({
        subject: replaceVars(template.subject),
        body: replaceVars(template.body)
      });
    } else {
      setMessagePreview({ subject: '', body: '' });
    }
  };

  const handleSend = () => {
    if (!composingTo) return;
    const mailto = `mailto:${composingTo.contact.email}?subject=${encodeURIComponent(messagePreview.subject)}&body=${encodeURIComponent(messagePreview.body)}`;
    window.open(mailto, '_blank');
    setComposingTo(null);
    setSelectedTemplateId('');
    setMessagePreview({ subject: '', body: '' });
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (addingContactTo) {
      addContact(addingContactTo, newContact);
      setAddingContactTo(null);
      setNewContact({ name: '', role: '', email: '', ig: '' });
    }
  };

  const handleEditContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      updateContact(editingContact.partnerId, editingContact.contact.id, editingContact.contact);
      setEditingContact(null);
    }
  };

  const handleDeleteContact = (partnerId: string, contactId: string) => {
    deleteContact(partnerId, contactId);
  };

  return (
    <div className="p-6 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6 mt-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Directorio</h1>
        <button
          className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
          style={{ backgroundColor: accentColor }}
        >
          <Plus size={28} />
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar marcas o contactos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:border-transparent shadow-sm transition-shadow"
          style={{ '--tw-ring-color': accentColor } as any}
        />
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pb-4 hide-scrollbar">
        {filteredPartners.map(partner => {
          const isExpanded = expandedId === partner.id;
          return (
            <div key={partner.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all">
              <div
                className="p-5 flex items-center justify-between cursor-pointer active:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : partner.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{partner.name}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg mt-1.5 inline-block ${getStatusColor(partner.status)}`}>
                      {partner.status}
                    </span>
                  </div>
                </div>
                <div className="text-gray-400 shrink-0 ml-2">
                  {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-gray-50 bg-gray-50/30">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-2">Contactos</h4>
                  {partner.contacts.length > 0 ? (
                    <div className="space-y-3">
                      {partner.contacts.map(contact => (
                        <div key={contact.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-sm text-gray-900">{contact.name}</p>
                              <p className="text-xs text-gray-500 font-medium">{contact.role}</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setEditingContact({ partnerId: partner.id, contact })}
                                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteContact(partner.id, contact.id)}
                                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button 
                                onClick={() => setComposingTo({ contact, partner })}
                                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                              >
                                <Send size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50">
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                              <Mail size={14} /> Email
                            </a>
                            <a href={`https://instagram.com/${contact.ig.replace('@','')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                              <Instagram size={14} /> {contact.ig}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 font-medium italic py-2">No hay contactos registrados.</p>
                  )}
                  <button 
                    onClick={() => setAddingContactTo(partner.id)}
                    className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors active:scale-[0.98]"
                  >
                    + Añadir Contacto
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filteredPartners.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">No se encontraron resultados.</p>
          </div>
        )}
      </div>

      {/* Compose Message Modal */}
      {composingTo && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[90%] sm:rounded-3xl rounded-t-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Mensaje a {composingTo.contact.name}</h2>
                <p className="text-xs text-gray-500 font-medium mt-1">{composingTo.partner.name}</p>
              </div>
              <button onClick={() => setComposingTo(null)} className="text-gray-400 p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Usar Plantilla</label>
                <select 
                  value={selectedTemplateId} 
                  onChange={e => handleTemplateSelect(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all appearance-none"
                  style={{ '--tw-ring-color': accentColor } as any}
                >
                  <option value="">-- Seleccionar --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {selectedTemplateId && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asunto</label>
                    <input 
                      value={messagePreview.subject} 
                      onChange={e => setMessagePreview({...messagePreview, subject: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" 
                      style={{ '--tw-ring-color': accentColor } as any} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mensaje</label>
                    <textarea 
                      value={messagePreview.body} 
                      onChange={e => setMessagePreview({...messagePreview, body: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all min-h-[150px]" 
                      style={{ '--tw-ring-color': accentColor } as any} 
                    />
                  </div>
                  <button 
                    onClick={handleSend}
                    className="w-full text-white font-bold py-4 rounded-2xl mt-2 transition-opacity hover:opacity-90 active:scale-[0.98] shadow-md flex items-center justify-center gap-2" 
                    style={{ backgroundColor: accentColor }}
                  >
                    <Send size={18} />
                    Abrir en Cliente de Correo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {addingContactTo && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[90%] sm:rounded-3xl rounded-t-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Añadir Contacto</h2>
              <button onClick={() => setAddingContactTo(null)} className="text-gray-400 p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">✕</button>
            </div>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre</label>
                <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="Ej. Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rol</label>
                <input required value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="Ej. PR Manager" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                <input type="email" required value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="juan@marca.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Instagram</label>
                <input value={newContact.ig} onChange={e => setNewContact({...newContact, ig: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="@juanperez" />
              </div>
              <button type="submit" className="w-full text-white font-bold py-4 rounded-2xl mt-4 transition-opacity hover:opacity-90 active:scale-[0.98] shadow-md" style={{ backgroundColor: accentColor }}>
                Guardar Contacto
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[90%] sm:rounded-3xl rounded-t-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Editar Contacto</h2>
              <button onClick={() => setEditingContact(null)} className="text-gray-400 p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">✕</button>
            </div>
            <form onSubmit={handleEditContact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre</label>
                <input required value={editingContact.contact.name} onChange={e => setEditingContact({...editingContact, contact: {...editingContact.contact, name: e.target.value}})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="Ej. Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rol</label>
                <input required value={editingContact.contact.role} onChange={e => setEditingContact({...editingContact, contact: {...editingContact.contact, role: e.target.value}})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="Ej. PR Manager" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                <input required type="email" value={editingContact.contact.email} onChange={e => setEditingContact({...editingContact, contact: {...editingContact.contact, email: e.target.value}})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="juan@ejemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Instagram</label>
                <input required value={editingContact.contact.ig} onChange={e => setEditingContact({...editingContact, contact: {...editingContact.contact, ig: e.target.value}})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="@juanperez" />
              </div>
              <button type="submit" className="w-full text-white font-bold py-4 rounded-2xl mt-2 transition-opacity hover:opacity-90 active:scale-[0.98] shadow-md" style={{ backgroundColor: accentColor }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
