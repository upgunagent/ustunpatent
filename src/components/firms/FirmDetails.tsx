'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ContractModal from './ContractModal';
import TrademarkForm from './TrademarkForm';
import { LucideBuilding2, LucideUser, LucidePlus, LucideExternalLink, LucidePhone, LucideMail, LucideGlobe, LucideShieldCheck, LucideFileText, LucideUsers, LucideTrash2, LucidePencil, LucideCheck, LucideX as LucideXIcon } from 'lucide-react';
import EditableField from '../ui/editable-field';
import { SECTORS } from '@/constants/sectors';
import { getFirmHistory, updateActionStatus } from '@/actions/history';
import { addFirmContact, updateFirmContact, deleteFirmContact, type ContactData } from '@/actions/firms';
import { toast } from 'sonner';
import { LucideHistory, LucideCheckCircle, LucideXCircle, LucideClock, LucideEye } from 'lucide-react';

// Helper to format dates
const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
};


export default function FirmDetails({ firm, trademarks, agencySettings, firmContacts: initialContacts }: { firm: any, trademarks: any[], agencySettings?: any, firmContacts?: any[] }) {
    const [isTrademarkModalOpen, setIsTrademarkModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [contractAction, setContractAction] = useState<any>(null);
    const [editingTrademark, setEditingTrademark] = useState<any>(null);
    const [firmContacts, setFirmContacts] = useState<any[]>(initialContacts || []);

    // Contact editing state
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [editContactData, setEditContactData] = useState<any>(null);
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [newContact, setNewContact] = useState<ContactData>({
        full_name: '', tc_no: '', tpmk_owner_no: '', phones: [''], emails: [''],
    });

    const handleDeleteAction = async (actionId: string) => {
        if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;

        try {
            const { deleteFirmAction } = await import('@/actions/firms');
            const result = await deleteFirmAction(actionId);

            if (result.success) {
                toast.success(result.message);
                setHistory(prev => prev.filter(item => item.id !== actionId));
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('İşlem silinemedi.');
        }
    };
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [previewAction, setPreviewAction] = useState<any>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

    useEffect(() => {
        if (firm?.id) {
            setLoadingHistory(true);
            getFirmHistory(firm.id)
                .then(setHistory)
                .finally(() => setLoadingHistory(false));
        }
    }, [firm?.id]);

    const handleStatusUpdate = async (actionId: string, newStatus: string) => {
        try {
            await updateActionStatus(actionId, newStatus);
            setHistory(prev => prev.map(item => item.id === actionId ? { ...item, status: newStatus } : item));
            toast.success('Durum güncellendi');
        } catch (error) {
            toast.error('Durum güncellenemedi');
        }
    };

    // Contact CRUD handlers
    const handleAddContact = async () => {
        if (!newContact.full_name.trim()) {
            toast.error('Yetkili adı soyadı zorunludur.');
            return;
        }
        const result = await addFirmContact(firm.id, newContact);
        if (result.success) {
            toast.success('Yetkili eklendi.');
            setFirmContacts(prev => [...prev, result.data]);
            setIsAddingContact(false);
            setNewContact({ full_name: '', tc_no: '', tpmk_owner_no: '', phones: [''], emails: [''] });
        } else {
            toast.error(result.message || 'Yetkili eklenirken hata oluştu.');
        }
    };

    const handleSaveEditContact = async () => {
        if (!editContactData || !editingContactId) return;
        const result = await updateFirmContact(editingContactId, firm.id, editContactData);
        if (result.success) {
            toast.success('Yetkili güncellendi.');
            setFirmContacts(prev => prev.map(c => c.id === editingContactId ? { ...c, ...editContactData } : c));
            setEditingContactId(null);
            setEditContactData(null);
        } else {
            toast.error(result.message || 'Yetkili güncellenirken hata oluştu.');
        }
    };

    const handleDeleteContact = async (contactId: string) => {
        if (!confirm('Bu yetkiliyi silmek istediğinize emin misiniz?')) return;
        const result = await deleteFirmContact(contactId, firm.id);
        if (result.success) {
            toast.success(result.message);
            setFirmContacts(prev => prev.filter(c => c.id !== contactId));
        } else {
            toast.error(result.message || 'Yetkili silinemedi.');
        }
    };

    const startEditContact = (contact: any) => {
        setEditingContactId(contact.id);
        setEditContactData({
            full_name: contact.full_name || '',
            tc_no: contact.tc_no || '',
            tpmk_owner_no: contact.tpmk_owner_no || '',
            phones: contact.phones?.length > 0 ? [...contact.phones] : [''],
            emails: contact.emails?.length > 0 ? [...contact.emails] : [''],
        });
    };

    // Collect all phones and emails from contacts for the header
    const allPhones = firmContacts.flatMap(c => c.phones || []).filter(Boolean);
    const allEmails = firmContacts.flatMap(c => c.emails || []).filter(Boolean);

    const getStatusBadge = (status: string, id: string) => {
        const styles: Record<string, string> = {
            'sent': 'bg-blue-100 text-blue-800',
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800',
            'contract_sent': 'bg-purple-100 text-purple-800',
            'objected': 'bg-orange-100 text-orange-800'
        };

        const labels: Record<string, string> = {
            'sent': 'Gönderildi',
            'approved': 'Onaylandı',
            'rejected': 'Onaylanmadı',
            'contract_sent': 'Sözleşme İletildi',
            'objected': 'İtiraz Edildi'
        };

        return (
            <select
                value={status}
                onChange={(e) => handleStatusUpdate(id, e.target.value)}
                className={`text-xs font-semibold px-2 py-1 rounded-full border-0 focus:ring-1 focus:ring-blue-500 cursor-pointer ${styles[status] || styles['pending']}`}
            >
                {Object.entries(labels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                ))}
            </select>
        );
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="rounded-xl bg-[#001a4f] p-8 text-white shadow-lg">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${firm.type === 'corporate'
                                ? 'bg-blue-500/20 text-blue-100 border border-blue-400/30'
                                : 'bg-green-500/20 text-green-100 border border-green-400/30'
                                }`}>
                                {firm.type === 'corporate' ? <LucideBuilding2 size={14} /> : <LucideUser size={14} />}
                                {firm.type === 'corporate' ? 'Tüzel Kişi' : 'Şahıs'}
                            </span>
                            <span className="text-white/60 text-sm">{firm.sector}</span>
                        </div>

                        <h1 className="text-3xl font-bold mb-2 md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
                            {firm.type === 'corporate' ? firm.corporate_title : firm.individual_name_surname || firm.name}
                        </h1>
                        <p className="text-white/80 text-lg">{firm.name}</p>
                    </div>
                </div>

                <div className="grid gap-6 mt-8 md:grid-cols-4 border-t border-white/10 pt-6">
                    <div className="flex items-start gap-3">
                        <LucidePhone className="text-white/60 mt-1" size={20} />
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">Telefon</p>
                            {allPhones.length > 0 ? (
                                <div className="space-y-0.5">
                                    {allPhones.slice(0, 2).map((p, i) => (
                                        <p key={i} className="font-medium">{p}</p>
                                    ))}
                                    {allPhones.length > 2 && (
                                        <p className="text-xs text-white/50">+{allPhones.length - 2} daha</p>
                                    )}
                                </div>
                            ) : <p className="font-medium">{firm.phone || '-'}</p>}
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <LucideMail className="text-white/60 mt-1" size={20} />
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">E-posta</p>
                            {allEmails.length > 0 ? (
                                <div className="space-y-0.5">
                                    {allEmails.slice(0, 2).map((e, i) => (
                                        <p key={i} className="font-medium text-sm">{e}</p>
                                    ))}
                                    {allEmails.length > 2 && (
                                        <p className="text-xs text-white/50">+{allEmails.length - 2} daha</p>
                                    )}
                                </div>
                            ) : <p className="font-medium">{firm.email || '-'}</p>}
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <LucideGlobe className="text-white/60 mt-1" size={20} />
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">Web Sitesi</p>
                            {firm.website ? (
                                <a href={firm.website} target="_blank" rel="noreferrer" className="font-medium hover:underline flex items-center gap-1">
                                    {firm.website.replace(/^https?:\/\//, '')}
                                    <LucideExternalLink size={12} />
                                </a>
                            ) : <p>-</p>}
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <LucideUsers className="text-white/60 mt-1" size={20} />
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">Müşteri Temsilcisi</p>
                            <p className="font-medium">{firm.representative || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>


            <div className="grid gap-8 lg:grid-cols-3">
                {/* Sol Kolon: Firma Detay Kartı */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Resmi Bilgiler */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 border-b pb-3 mb-4">Resmi Bilgiler</h3>
                        <div className="space-y-4">
                            {firm.type === 'corporate' ? (
                                <>
                                    <div>
                                        <EditableField firmId={firm.id} field="corporate_title" value={firm.corporate_title} multiline label="Firma Ünvanı" />
                                    </div>
                                    <div>
                                        <EditableField firmId={firm.id} field="corporate_address" value={firm.corporate_address} multiline label="Firma Adresi" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <EditableField firmId={firm.id} field="corporate_tax_office" value={firm.corporate_tax_office} label="Vergi Dairesi" />
                                        <EditableField firmId={firm.id} field="corporate_tax_number" value={firm.corporate_tax_number} label="Vergi Numarası" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <EditableField firmId={firm.id} field="individual_name_surname" value={firm.individual_name_surname} label="Ad Soyad" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <EditableField firmId={firm.id} field="individual_tc" value={firm.individual_tc} label="TC Kimlik No" />
                                        <EditableField firmId={firm.id} field="individual_born_date" value={firm.individual_born_date} label="Doğum Tarihi" type="date" />
                                        <EditableField firmId={firm.id} field="individual_address" value={firm.individual_address} multiline label="Adres" />
                                    </div>
                                </>
                            )}

                            <div>
                                <EditableField firmId={firm.id} field="sector" value={firm.sector} options={SECTORS} label="Sektör" />
                            </div>

                            <hr className="my-2" />

                            <div>
                                <EditableField firmId={firm.id} field="website" value={firm.website} label="Web Sitesi" />
                            </div>
                            <div>
                                <EditableField
                                    firmId={firm.id}
                                    field="representative"
                                    value={firm.representative}
                                    label="Müşteri Temsilcisi"
                                    options={agencySettings?.consultants?.map((c: any) => c.name)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Yetkili Kişiler Kartı */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between border-b pb-3 mb-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <LucideUsers size={18} className="text-[#001a4f]" />
                                Yetkili Kişiler
                                <span className="text-xs font-normal text-gray-400">({firmContacts.length})</span>
                            </h3>
                            <button
                                onClick={() => setIsAddingContact(true)}
                                className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded transition-colors"
                            >
                                <LucidePlus size={14} />
                                Ekle
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Add Contact Form */}
                            {isAddingContact && (
                                <div className="border border-green-200 rounded-lg p-4 bg-green-50/50 space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Ad Soyad *"
                                        value={newContact.full_name}
                                        onChange={e => setNewContact(p => ({ ...p, full_name: e.target.value }))}
                                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#001a4f] focus:outline-none"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="TC No"
                                            maxLength={11}
                                            value={newContact.tc_no}
                                            onChange={e => setNewContact(p => ({ ...p, tc_no: e.target.value }))}
                                            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#001a4f] focus:outline-none"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Marka Sahip No"
                                            value={newContact.tpmk_owner_no}
                                            onChange={e => setNewContact(p => ({ ...p, tpmk_owner_no: e.target.value }))}
                                            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#001a4f] focus:outline-none"
                                        />
                                    </div>
                                    {/* Phones */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Telefonlar</label>
                                        {newContact.phones.map((p, i) => (
                                            <div key={i} className="flex gap-1">
                                                <input
                                                    type="tel"
                                                    placeholder="5XX XXX XX XX"
                                                    value={p}
                                                    onChange={e => {
                                                        const phones = [...newContact.phones];
                                                        phones[i] = e.target.value;
                                                        setNewContact(prev => ({ ...prev, phones }));
                                                    }}
                                                    className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-[#001a4f] focus:outline-none"
                                                />
                                                {newContact.phones.length > 1 && (
                                                    <button type="button" onClick={() => setNewContact(prev => ({ ...prev, phones: prev.phones.filter((_, pi) => pi !== i) }))}
                                                        className="text-red-400 hover:text-red-600 p-1"><LucideTrash2 size={14} /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setNewContact(prev => ({ ...prev, phones: [...prev.phones, ''] }))}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"><LucidePlus size={12} /> Telefon Ekle</button>
                                    </div>
                                    {/* Emails */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">E-postalar</label>
                                        {newContact.emails.map((em, i) => (
                                            <div key={i} className="flex gap-1">
                                                <input
                                                    type="email"
                                                    placeholder="ornek@sirket.com"
                                                    value={em}
                                                    onChange={e => {
                                                        const emails = [...newContact.emails];
                                                        emails[i] = e.target.value;
                                                        setNewContact(prev => ({ ...prev, emails }));
                                                    }}
                                                    className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-[#001a4f] focus:outline-none"
                                                />
                                                {newContact.emails.length > 1 && (
                                                    <button type="button" onClick={() => setNewContact(prev => ({ ...prev, emails: prev.emails.filter((_, ei) => ei !== i) }))}
                                                        className="text-red-400 hover:text-red-600 p-1"><LucideTrash2 size={14} /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setNewContact(prev => ({ ...prev, emails: [...prev.emails, ''] }))}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"><LucidePlus size={12} /> E-posta Ekle</button>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button onClick={() => { setIsAddingContact(false); setNewContact({ full_name: '', tc_no: '', tpmk_owner_no: '', phones: [''], emails: [''] }); }}
                                            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">İptal</button>
                                        <button onClick={handleAddContact}
                                            className="text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded font-medium">Kaydet</button>
                                    </div>
                                </div>
                            )}

                            {/* Contact Cards */}
                            {firmContacts.map((contact) => (
                                <div key={contact.id} className="border border-gray-100 rounded-lg p-3 hover:border-gray-300 transition-colors group">
                                    {editingContactId === contact.id && editContactData ? (
                                        /* Edit Mode */
                                        <div className="space-y-2">
                                            <input type="text" value={editContactData.full_name}
                                                onChange={e => setEditContactData((p: any) => ({ ...p, full_name: e.target.value }))}
                                                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-[#001a4f] focus:outline-none font-medium" />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text" value={editContactData.tc_no} placeholder="TC No" maxLength={11}
                                                    onChange={e => setEditContactData((p: any) => ({ ...p, tc_no: e.target.value }))}
                                                    className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-[#001a4f] focus:outline-none" />
                                                <input type="text" value={editContactData.tpmk_owner_no} placeholder="Sahip No"
                                                    onChange={e => setEditContactData((p: any) => ({ ...p, tpmk_owner_no: e.target.value }))}
                                                    className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-[#001a4f] focus:outline-none" />
                                            </div>
                                            {/* Edit Phones */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-gray-500 uppercase">Telefonlar</label>
                                                {editContactData.phones.map((p: string, i: number) => (
                                                    <div key={i} className="flex gap-1">
                                                        <input type="tel" value={p}
                                                            onChange={e => {
                                                                const phones = [...editContactData.phones];
                                                                phones[i] = e.target.value;
                                                                setEditContactData((prev: any) => ({ ...prev, phones }));
                                                            }}
                                                            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-[#001a4f] focus:outline-none" />
                                                        {editContactData.phones.length > 1 && (
                                                            <button type="button" onClick={() => setEditContactData((prev: any) => ({ ...prev, phones: prev.phones.filter((_: any, pi: number) => pi !== i) }))}
                                                                className="text-red-400 hover:text-red-600 p-0.5"><LucideTrash2 size={12} /></button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => setEditContactData((prev: any) => ({ ...prev, phones: [...prev.phones, ''] }))}
                                                    className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5"><LucidePlus size={10} /> Telefon</button>
                                            </div>
                                            {/* Edit Emails */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-gray-500 uppercase">E-postalar</label>
                                                {editContactData.emails.map((em: string, i: number) => (
                                                    <div key={i} className="flex gap-1">
                                                        <input type="email" value={em}
                                                            onChange={e => {
                                                                const emails = [...editContactData.emails];
                                                                emails[i] = e.target.value;
                                                                setEditContactData((prev: any) => ({ ...prev, emails }));
                                                            }}
                                                            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-[#001a4f] focus:outline-none" />
                                                        {editContactData.emails.length > 1 && (
                                                            <button type="button" onClick={() => setEditContactData((prev: any) => ({ ...prev, emails: prev.emails.filter((_: any, ei: number) => ei !== i) }))}
                                                                className="text-red-400 hover:text-red-600 p-0.5"><LucideTrash2 size={12} /></button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => setEditContactData((prev: any) => ({ ...prev, emails: [...prev.emails, ''] }))}
                                                    className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5"><LucidePlus size={10} /> E-posta</button>
                                            </div>
                                            <div className="flex justify-end gap-1.5 pt-1">
                                                <button onClick={() => { setEditingContactId(null); setEditContactData(null); }}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><LucideXIcon size={14} /></button>
                                                <button onClick={handleSaveEditContact}
                                                    className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"><LucideCheck size={14} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-sm text-gray-900">{contact.full_name}</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditContact(contact)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><LucidePencil size={13} /></button>
                                                    <button onClick={() => handleDeleteContact(contact.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><LucideTrash2 size={13} /></button>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 space-y-0.5">
                                                {contact.tc_no && <div>TC: {contact.tc_no}</div>}
                                                {contact.tpmk_owner_no && <div>Sahip No: {contact.tpmk_owner_no}</div>}
                                                {contact.phones?.filter(Boolean).length > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <LucidePhone size={11} />
                                                        {contact.phones.filter(Boolean).join(', ')}
                                                    </div>
                                                )}
                                                {contact.emails?.filter(Boolean).length > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <LucideMail size={11} />
                                                        {contact.emails.filter(Boolean).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {firmContacts.length === 0 && !isAddingContact && (
                                <p className="text-xs text-gray-400 text-center py-4">
                                    Henüz yetkili kişi eklenmemiş.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sağ Kolon: Markalar */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Markalar</h2>
                        <button
                            onClick={() => {
                                setEditingTrademark(null);
                                setIsTrademarkModalOpen(true);
                            }}
                            className="flex items-center gap-2 rounded-lg bg-[#001a4f] px-4 py-2 text-sm font-medium text-white hover:bg-[#002366] transition-colors"
                        >
                            <LucidePlus size={16} />
                            Marka Ekle
                        </button>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                                    <tr>
                                        <th className="px-6 py-3">Logo</th>
                                        <th className="px-6 py-3">Marka Adı</th>
                                        <th className="px-6 py-3">Başvuru No</th>
                                        <th className="px-6 py-3">Sınıflar</th>
                                        <th className="px-6 py-3">İzleme</th>
                                        <th className="px-6 py-3">Bitiş Tarihi</th>
                                        <th className="px-6 py-3">Danışman</th>
                                        <th className="px-6 py-3 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {trademarks && trademarks.length > 0 ? (
                                        trademarks.map((t) => (
                                            <tr key={t.id} className="hover:bg-gray-50 group">
                                                <td className="px-6 py-4">
                                                    <div className="h-10 w-10 relative bg-gray-100 rounded border overflow-hidden">
                                                        {t.logo_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={t.logo_url} alt={t.name} className="h-full w-full object-contain" />
                                                        ) : (
                                                            <span className="text-[10px] flex items-center justify-center h-full text-gray-400">Yok</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                                                <td className="px-6 py-4">{t.application_no}</td>
                                                <td className="px-6 py-4">
                                                    {t.classes ? (
                                                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                            {t.classes}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {t.watch_agreement ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                                            <LucideShieldCheck size={14} />
                                                            Var
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">Yok</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">{formatDate(t.watch_end_date)}</td>
                                                <td className="px-6 py-4">{t.consultant_name}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm('Bu markayı silmek istediğinize emin misiniz?')) return;

                                                                const { deleteTrademark } = await import('@/actions/firms');
                                                                const result = await deleteTrademark(t.id, firm.id);

                                                                if (result.success) {
                                                                    toast.success(result.message);
                                                                } else {
                                                                    toast.error(result.message);
                                                                }
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Markayı Sil"
                                                        >
                                                            <LucideTrash2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingTrademark(t);
                                                                setIsTrademarkModalOpen(true);
                                                            }}
                                                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:ring-offset-2 transition-all"
                                                        >
                                                            İncele/Düzenle
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                                Bu firmaya ait kayıtlı marka bulunmamaktadır.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>


            {/* Alt Kolon/Sekme: İşlem Geçmişi */}
            <div className="lg:col-span-3 space-y-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <LucideHistory className="text-gray-500" />
                        İşlem Geçmişi
                    </h2>
                    <div className="flex gap-2">
                        <select
                            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedMonth || ''}
                            onChange={(e) => setSelectedMonth(e.target.value || null)}
                        >
                            <option value="">Ay Seçiniz</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>
                                    {new Date(0, m - 1).toLocaleString('tr-TR', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                        <select
                            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedYear || ''}
                            onChange={(e) => setSelectedYear(e.target.value || null)}
                        >
                            <option value="">Yıl Seçiniz</option>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-500">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                                <tr>
                                    <th className="px-6 py-3">Tarih</th>
                                    <th className="px-6 py-3">İşlem Türü</th>
                                    <th className="px-6 py-3">Detay / Konu</th>
                                    <th className="px-6 py-3">Ekler</th>
                                    <th className="px-6 py-3">Durum</th>
                                    <th className="px-6 py-3 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loadingHistory ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center">Yükleniyor...</td></tr>
                                ) : history.length > 0 ? (
                                    history
                                        .filter(action => {
                                            const actionDate = new Date(action.created_at);
                                            const yearMatch = selectedYear ? actionDate.getFullYear().toString() === selectedYear : true;
                                            const monthMatch = selectedMonth ? (actionDate.getMonth() + 1).toString() === selectedMonth : true;
                                            return yearMatch && monthMatch;
                                        })
                                        .map((action) => (
                                            <tr key={action.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {new Date(action.created_at).toLocaleString('tr-TR')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {action.type === 'notification_email' ? (
                                                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                            <LucideMail size={14} /> Benzerlik Bildirimi
                                                        </span>
                                                    ) : action.type === 'contract_sent' ? (
                                                        <span className="flex items-center gap-1 text-purple-600 font-medium">
                                                            <LucideFileText size={14} /> Sözleşme
                                                        </span>
                                                    ) : action.type}
                                                </td>
                                                <td className="px-6 py-4 max-w-md truncate">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <span className={`font-bold block mb-1 ${action.metadata?.subject?.includes('Rastlanıldı !!!') ? 'text-green-600' :
                                                                action.metadata?.subject?.includes('Rastlanılmadı') ? 'text-red-600' :
                                                                    'text-gray-900'
                                                                }`}>
                                                                {action.metadata?.subject || '-'}
                                                            </span>
                                                            <span className="text-gray-400 text-xs">
                                                                {action.metadata?.sent_to}
                                                            </span>
                                                        </div>

                                                        {(action.type === 'notification_email' || action.type === 'contract_sent') && (
                                                            <button
                                                                onClick={() => {
                                                                    setPreviewAction(action);
                                                                    setIsPreviewModalOpen(true);
                                                                }}
                                                                className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors whitespace-nowrap"
                                                            >
                                                                İçeriği Gör
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {action.metadata?.attachment_count > 0 ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-medium text-gray-700">{action.metadata.attachment_count} Ek</span>
                                                            <span className="text-[10px] text-gray-400 truncate max-w-[200px]">
                                                                {action.metadata.attachment_names?.join(', ')}
                                                            </span>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {getStatusBadge(action.status, action.id)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(action.type === 'contract_sent' && action.metadata?.pdf_url) ? (
                                                            <a
                                                                href={action.metadata.pdf_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors"
                                                            >
                                                                <LucideEye size={14} />
                                                                Sözleşmeyi Görüntüle
                                                            </a>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    if (action.metadata?.subject?.includes('Benzer Markaya Rastlanılmadı')) return;
                                                                    setContractAction(action);
                                                                    setIsContractModalOpen(true);
                                                                }}
                                                                disabled={action.metadata?.subject?.includes('Benzer Markaya Rastlanılmadı')}
                                                                className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border transition-colors ${action.metadata?.subject?.includes('Benzer Markaya Rastlanılmadı')
                                                                    ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                                                                    : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
                                                                    }`}
                                                            >
                                                                <LucideFileText size={14} />
                                                                Sözleşme Oluştur
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteAction(action.id)}
                                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                            title="İşlemi Sil"
                                                        >
                                                            <LucideTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                            Henüz bir işlem kaydı bulunmamaktadır.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>


            {
                isTrademarkModalOpen && (
                    <TrademarkForm
                        firmId={firm.id}
                        onClose={() => {
                            setIsTrademarkModalOpen(false);
                            setEditingTrademark(null);
                        }}
                        initialData={editingTrademark}
                        firmContacts={firmContacts}
                    />
                )
            }

            {
                isContractModalOpen && contractAction && agencySettings && (
                    <ContractModal
                        firm={firm}
                        trademarks={trademarks}
                        action={contractAction}
                        agencySettings={agencySettings}
                        onClose={() => {
                            setIsContractModalOpen(false);
                            setContractAction(null);
                        }}
                    />
                )
            }

            {/* Preview Modal for Email History */}
            {
                isPreviewModalOpen && previewAction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
                            <div className="flex items-center justify-between border-b p-4 bg-gray-50 rounded-t-xl">
                                <h3 className="font-semibold text-gray-900">Mail Önizleme</h3>
                                <button
                                    onClick={() => setIsPreviewModalOpen(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <LucideXCircle size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Konu</label>
                                    <div className="text-gray-900 font-medium">{previewAction.metadata?.subject}</div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Alıcı</label>
                                    <div className="text-gray-900">{previewAction.metadata?.sent_to}</div>
                                </div>

                                {previewAction.metadata?.cc && previewAction.metadata.cc.length > 0 && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Bilgi (CC)</label>
                                        <div className="text-gray-900 text-sm">{Array.isArray(previewAction.metadata.cc) ? previewAction.metadata.cc.join(', ') : previewAction.metadata.cc}</div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">İçerik</label>
                                    <div
                                        className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 border border-gray-100 overflow-auto max-h-[400px]"
                                        dangerouslySetInnerHTML={{
                                            __html: (previewAction.metadata?.full_content || previewAction.metadata?.content_preview || 'İçerik bulunamadı.')
                                                .replace(/src="[^"]*\/images\/mail-signature\.png"/g, 'src="https://qmotrqehdzebojdowuol.supabase.co/storage/v1/object/public/firm-logos/assets/mail-signature.png"')
                                        }}
                                    />
                                </div>

                                {previewAction.metadata?.attachment_count > 0 && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Ekler</label>
                                        <div className="text-sm text-gray-600">
                                            {previewAction.metadata.attachment_names?.join(', ')}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                                <button
                                    onClick={() => setIsPreviewModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
