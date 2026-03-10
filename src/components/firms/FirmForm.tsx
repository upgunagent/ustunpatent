'use client';

import { useState } from 'react';
import { LucideBuilding2, LucideUser, LucideSave, LucidePlus, LucideTrash2, LucidePhone, LucideMail } from 'lucide-react';
import { createFirm } from '@/actions/firms';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { SECTORS } from '@/constants/sectors';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-[#001a4f] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#002366] disabled:opacity-50"
        >
            <LucideSave size={18} />
            {pending ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
    );
}

interface ContactEntry {
    full_name: string;
    tc_no: string;
    tpmk_owner_no: string;
    birth_date: string;
    phones: string[];
    emails: string[];
}

const emptyContact = (): ContactEntry => ({
    full_name: '',
    tc_no: '',
    tpmk_owner_no: '',
    birth_date: '',
    phones: [''],
    emails: [''],
});

export default function FirmForm({ consultants }: { consultants: any[] }) {
    const [type, setType] = useState<'individual' | 'corporate'>('corporate');
    const [contacts, setContacts] = useState<ContactEntry[]>([]);

    // Firm-level phone/email state
    const [firmPhones, setFirmPhones] = useState<string[]>(['']);
    const [firmEmails, setFirmEmails] = useState<string[]>(['']);

    const addContact = () => {
        setContacts(prev => [...prev, emptyContact()]);
    };

    const removeContact = (index: number) => {
        setContacts(prev => prev.filter((_, i) => i !== index));
    };

    const updateContact = (index: number, field: keyof ContactEntry, value: any) => {
        setContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    };

    const addPhone = (contactIndex: number) => {
        setContacts(prev => prev.map((c, i) =>
            i === contactIndex ? { ...c, phones: [...c.phones, ''] } : c
        ));
    };

    const removePhone = (contactIndex: number, phoneIndex: number) => {
        setContacts(prev => prev.map((c, i) =>
            i === contactIndex ? { ...c, phones: c.phones.filter((_, pi) => pi !== phoneIndex) } : c
        ));
    };

    const formatPhoneNumber = (val: string) => {
        const digits = val.replace(/\D/g, '');
        const limited = digits.substring(0, 11);
        let formatted = limited;
        if (limited.length > 3) {
            formatted = limited.substring(0, 4) + ' ' + limited.substring(4);
        }
        if (limited.length > 6) {
            formatted = formatted.substring(0, 8) + ' ' + limited.substring(7);
        }
        if (limited.length > 8) {
            formatted = formatted.substring(0, 11) + ' ' + limited.substring(9);
        }
        return formatted;
    };

    const updatePhone = (contactIndex: number, phoneIndex: number, value: string) => {
        const formatted = formatPhoneNumber(value);
        setContacts(prev => prev.map((c, i) =>
            i === contactIndex ? { ...c, phones: c.phones.map((p, pi) => pi === phoneIndex ? formatted : p) } : c
        ));
    };

    const addEmail = (contactIndex: number) => {
        setContacts(prev => prev.map((c, i) =>
            i === contactIndex ? { ...c, emails: [...c.emails, ''] } : c
        ));
    };

    const removeEmail = (contactIndex: number, emailIndex: number) => {
        setContacts(prev => prev.map((c, i) =>
            i === contactIndex ? { ...c, emails: c.emails.filter((_, ei) => ei !== emailIndex) } : c
        ));
    };

    const updateEmail = (contactIndex: number, emailIndex: number, value: string) => {
        setContacts(prev => prev.map((c, i) =>
            i === contactIndex ? { ...c, emails: c.emails.map((e, ei) => ei === emailIndex ? value : e) } : c
        ));
    };

    // Firm-level phone/email helpers
    const addFirmPhone = () => setFirmPhones(prev => [...prev, '']);
    const removeFirmPhone = (idx: number) => setFirmPhones(prev => prev.filter((_, i) => i !== idx));
    const updateFirmPhone = (idx: number, val: string) => {
        const formatted = formatPhoneNumber(val);
        setFirmPhones(prev => prev.map((p, i) => i === idx ? formatted : p));
    };
    const addFirmEmail = () => setFirmEmails(prev => [...prev, '']);
    const removeFirmEmail = (idx: number) => setFirmEmails(prev => prev.filter((_, i) => i !== idx));
    const updateFirmEmail = (idx: number, val: string) => setFirmEmails(prev => prev.map((e, i) => i === idx ? val : e));

    const handleSubmit = async (formData: FormData) => {
        // Inject contacts JSON into form data (may be empty)
        formData.append('contacts', JSON.stringify(contacts));
        // Inject firm-level phones/emails
        formData.append('firm_phones', JSON.stringify(firmPhones));
        formData.append('firm_emails', JSON.stringify(firmEmails));

        // Set individual name from first contact if individual type
        if (type === 'individual' && !formData.get('individual_name_surname')) {
            formData.set('individual_name_surname', contacts[0]?.full_name || '');
        }

        await createFirm(formData);
    };

    const inputClass = "flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent";

    return (
        <form action={handleSubmit} className="space-y-8">
            <input type="hidden" name="type" value={type} />

            {/* Header / Type Selection */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Yeni Firma Ekle</h2>
                    <p className="text-gray-500">Yeni bir müşteri veya firma kaydı oluşturun.</p>
                </div>

                <div className="flex rounded-lg bg-gray-100 p-1">
                    <button
                        type="button"
                        onClick={() => setType('corporate')}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${type === 'corporate'
                            ? 'bg-[#001a4f] text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <LucideBuilding2 size={16} />
                        Tüzel Kişi (Şirket)
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('individual')}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${type === 'individual'
                            ? 'bg-[#001a4f] text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <LucideUser size={16} />
                        Şahıs
                    </button>
                </div>
            </div>

            {/* Yetkili Kişiler Bölümü */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Yetkili Kişiler / Ortaklar / Marka Sahipleri
                        <span className="ml-2 text-sm font-normal text-gray-500">({contacts.length} kişi)</span>
                    </h3>
                    <button
                        type="button"
                        onClick={addContact}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                        <LucidePlus size={16} />
                        Yetkili Ekle
                    </button>
                </div>

                {contacts.map((contact, cIdx) => (
                    <div key={cIdx} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 relative">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-[#001a4f]">
                                {cIdx + 1}. Yetkili Kişi
                            </h4>
                            {contacts.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeContact(cIdx)}
                                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                >
                                    <LucideTrash2 size={14} />
                                    Kaldır
                                </button>
                            )}
                        </div>

                        {/* Row 1: Ad Soyad, TC No, Marka Sahip No */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="grid gap-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Yetkili Adı Soyadı <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={contact.full_name}
                                    onChange={(e) => updateContact(cIdx, 'full_name', e.target.value)}
                                    placeholder="Ad Soyad"
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <label className="text-sm font-medium text-gray-700">TC Kimlik No</label>
                                <input
                                    type="text"
                                    maxLength={11}
                                    value={contact.tc_no}
                                    onChange={(e) => updateContact(cIdx, 'tc_no', e.target.value)}
                                    placeholder="XXXXXXXXXXX"
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <label className="text-sm font-medium text-gray-700">Marka Sahip No</label>
                                <input
                                    type="text"
                                    value={contact.tpmk_owner_no}
                                    onChange={(e) => updateContact(cIdx, 'tpmk_owner_no', e.target.value)}
                                    placeholder="TPMK Sahip No"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Row 1.5: Doğum Tarihi */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="grid gap-1.5">
                                <label className="text-sm font-medium text-gray-700">Doğum Tarihi</label>
                                <input
                                    type="date"
                                    value={contact.birth_date || ''}
                                    onChange={(e) => updateContact(cIdx, 'birth_date', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Row 2: Telefonlar ve E-postalar */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Telefonlar */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    <LucidePhone size={14} />
                                    Telefon Numaraları
                                </label>
                                {contact.phones.map((phone, pIdx) => (
                                    <div key={pIdx} className="flex gap-2">
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => updatePhone(cIdx, pIdx, e.target.value)}
                                            placeholder="05XX XXX XX XX"
                                            className={inputClass}
                                        />
                                        {contact.phones.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removePhone(cIdx, pIdx)}
                                                className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <LucideTrash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addPhone(cIdx)}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    <LucidePlus size={14} />
                                    Telefon Ekle
                                </button>
                            </div>

                            {/* E-postalar */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    <LucideMail size={14} />
                                    E-posta Adresleri
                                </label>
                                {contact.emails.map((email, eIdx) => (
                                    <div key={eIdx} className="flex gap-2">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => updateEmail(cIdx, eIdx, e.target.value)}
                                            placeholder="ornek@sirket.com"
                                            className={inputClass}
                                        />
                                        {contact.emails.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEmail(cIdx, eIdx)}
                                                className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <LucideTrash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addEmail(cIdx)}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    <LucidePlus size={14} />
                                    E-posta Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Sol Taraf: Genel Bilgiler */}
                <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-4 mb-4">
                        Genel Bilgiler
                    </h3>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Müşteri Temsilcisi</label>
                            <select
                                name="representative"
                                className={inputClass}
                            >
                                <option value="">İlgili müşteri temsilcisi seçiniz</option>
                                {consultants?.map((c) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Sektör</label>
                                <select
                                    name="sector"
                                    className={inputClass}
                                >
                                    <option value="">Seçiniz</option>
                                    {SECTORS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Web Adresi</label>
                                <input
                                    name="website"
                                    type="url"
                                    placeholder="https://"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Taraf: Firma Detayları (Dinamik) */}
                <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-4 mb-4">
                        {type === 'corporate' ? 'Şirket Bilgileri' : 'Kişisel Bilgiler'}
                    </h3>

                    {type === 'corporate' ? (
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Firma Ünvanı</label>
                                <input
                                    name="corporate_title"
                                    type="text"
                                    required
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Firma Adı (Kısa)</label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="Listede görünecek kısa isim"
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-gray-700">Vergi Dairesi</label>
                                    <input
                                        name="corporate_tax_office"
                                        type="text"
                                        className={inputClass}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-gray-700">Vergi Numarası</label>
                                    <input
                                        name="corporate_tax_number"
                                        type="text"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Marka Sahip No</label>
                                <input
                                    name="firm_tpmk_owner_no"
                                    type="text"
                                    placeholder="TPMK Sahip No"
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1"><LucidePhone size={14} /> Firma Telefon</label>
                                {firmPhones.map((phone, pIdx) => (
                                    <div key={pIdx} className="flex items-center gap-2">
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => updateFirmPhone(pIdx, e.target.value)}
                                            placeholder="05XX XXX XX XX"
                                            className={inputClass}
                                        />
                                        {firmPhones.length > 1 && (
                                            <button type="button" onClick={() => removeFirmPhone(pIdx)} className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                                <LucideTrash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addFirmPhone} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                    <LucidePlus size={14} /> Telefon Ekle
                                </button>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1"><LucideMail size={14} /> Firma E-posta</label>
                                {firmEmails.map((email, eIdx) => (
                                    <div key={eIdx} className="flex items-center gap-2">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => updateFirmEmail(eIdx, e.target.value)}
                                            placeholder="firma@ornek.com"
                                            className={inputClass}
                                        />
                                        {firmEmails.length > 1 && (
                                            <button type="button" onClick={() => removeFirmEmail(eIdx)} className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                                <LucideTrash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addFirmEmail} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                    <LucidePlus size={14} /> E-posta Ekle
                                </button>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Firma Adresi</label>
                                <textarea
                                    name="corporate_address"
                                    rows={3}
                                    className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
                                <input
                                    name="individual_name_surname"
                                    type="text"
                                    required
                                    defaultValue={contacts[0]?.full_name || ''}
                                    className={inputClass}
                                />
                                <input name="name" type="hidden" value="Individual" />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">TC Kimlik No</label>
                                <input
                                    name="individual_tc"
                                    type="text"
                                    maxLength={11}
                                    defaultValue={contacts[0]?.tc_no || ''}
                                    className={inputClass}
                                    onChange={(e) => {
                                        // TC = Vergi No for individual firms
                                        const taxNoInput = document.querySelector('input[name="individual_tax_number_hidden"]') as HTMLInputElement;
                                        if (taxNoInput) taxNoInput.value = e.target.value;
                                    }}
                                />
                                {/* Hidden field: vergi numarası = TC for individual */}
                                <input name="individual_tax_number_hidden" type="hidden" defaultValue={contacts[0]?.tc_no || ''} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Vergi Dairesi</label>
                                <input
                                    name="individual_tax_office"
                                    type="text"
                                    placeholder="Vergi dairesi adı"
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Doğum Tarihi</label>
                                <input
                                    name="individual_born_date"
                                    type="date"
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Marka Sahip No</label>
                                <input
                                    name="firm_tpmk_owner_no"
                                    type="text"
                                    placeholder="TPMK Sahip No"
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1"><LucidePhone size={14} /> Telefon</label>
                                {firmPhones.map((phone, pIdx) => (
                                    <div key={pIdx} className="flex items-center gap-2">
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => updateFirmPhone(pIdx, e.target.value)}
                                            placeholder="05XX XXX XX XX"
                                            className={inputClass}
                                        />
                                        {firmPhones.length > 1 && (
                                            <button type="button" onClick={() => removeFirmPhone(pIdx)} className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                                <LucideTrash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addFirmPhone} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                    <LucidePlus size={14} /> Telefon Ekle
                                </button>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1"><LucideMail size={14} /> E-posta</label>
                                {firmEmails.map((email, eIdx) => (
                                    <div key={eIdx} className="flex items-center gap-2">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => updateFirmEmail(eIdx, e.target.value)}
                                            placeholder="ornek@firma.com"
                                            className={inputClass}
                                        />
                                        {firmEmails.length > 1 && (
                                            <button type="button" onClick={() => removeFirmEmail(eIdx)} className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                                <LucideTrash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addFirmEmail} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                    <LucidePlus size={14} /> E-posta Ekle
                                </button>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Adres</label>
                                <textarea
                                    name="individual_address"
                                    rows={3}
                                    className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t pt-6">
                <Link
                    href="/panel/firms"
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                    İptal
                </Link>
                <SubmitButton />
            </div>
        </form>
    );
}
