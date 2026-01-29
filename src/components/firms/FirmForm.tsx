'use client';

import { useState } from 'react';
import { LucideBuilding2, LucideUser, LucideSave, LucideArrowLeft } from 'lucide-react';
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

export default function FirmForm() {
    const [type, setType] = useState<'individual' | 'corporate'>('corporate');

    return (
        <form action={createFirm} className="space-y-8">
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
                            ? 'bg-white text-[#001a4f] shadow-sm'
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
                            ? 'bg-white text-[#001a4f] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <LucideUser size={16} />
                        Şahıs
                    </button>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Sol Taraf: Temel Bilgiler */}
                <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-4 mb-4">
                        İletişim ve Yetkili Bilgileri
                    </h3>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Yetki İsmi</label>
                            <input
                                name="authority_name"
                                type="text"
                                placeholder="Örn: Genel Müdürlük"
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Müşteri Temsilcisi</label>
                            <input
                                name="representative"
                                type="text"
                                placeholder="İlgili müşteri temsilcisi"
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Telefon Numarası</label>
                                <input
                                    name="phone"
                                    type="tel"
                                    placeholder="5XX XXX XX XX"
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">E-posta</label>
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="ornek@sirket.com"
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">TPMK Sahip No</label>
                                <input
                                    name="tpmk_owner_no"
                                    type="text"
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Sektör</label>
                                <select
                                    name="sector"
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                >
                                    <option value="">Seçiniz</option>
                                    {SECTORS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Web Adresi</label>
                            <input
                                name="website"
                                type="url"
                                placeholder="https://"
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
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
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Firma Adı (Kısa)</label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="Listede görünecek kısa isim"
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-gray-700">Vergi Dairesi</label>
                                    <input
                                        name="corporate_tax_office"
                                        type="text"
                                        className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-gray-700">Vergi Numarası</label>
                                    <input
                                        name="corporate_tax_number"
                                        type="text"
                                        className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">Yetkili Kişi</label>
                                <input
                                    name="corporate_authorized_person"
                                    type="text"
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
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
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
                                {/* Hidden name field to map to common name column */}
                                <input name="name" type="hidden" value="Individual" />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-gray-700">TC Kimlik No</label>
                                <input
                                    name="individual_tc"
                                    type="text"
                                    maxLength={11}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                                />
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
