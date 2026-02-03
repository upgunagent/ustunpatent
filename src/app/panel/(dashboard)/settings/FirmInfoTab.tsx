'use client';

import React, { useState } from 'react';
import { AgencyData, updateAgencySettings, addAgencyPhone, removeAgencyPhone, addAgencyAddress, removeAgencyAddress, addAgencyBankAccount, removeAgencyBankAccount } from '@/actions/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LucidePlus, LucideTrash2, LucideSave, LucideBuilding, LucidePhone, LucideMail, LucideMapPin, LucideCreditCard, LucideLoader2 } from 'lucide-react';

interface Props {
    data: AgencyData;
}

export default function FirmInfoTab({ data }: Props) {
    const [loading, setLoading] = useState(false);

    // Main Settings State
    const [settings, setSettings] = useState({
        firm_name: data.settings?.firm_name || '',
        email: data.settings?.email || '',
        tax_office: data.settings?.tax_office || '',
        tax_number: data.settings?.tax_number || '',
    });

    const handleMainUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateAgencySettings(settings);
            alert('Bilgiler güncellendi.');
        } catch (err: any) {
            alert('Hata: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper for List Items (Phones, Addresses)
    const [newPhone, setNewPhone] = useState('');
    const handleAddPhone = async () => {
        if (!newPhone) return;
        setLoading(true);
        await addAgencyPhone(newPhone);
        setNewPhone('');
        setLoading(false);
    };

    const [newAddress, setNewAddress] = useState('');
    const handleAddAddress = async () => {
        if (!newAddress) return;
        setLoading(true);
        await addAgencyAddress(newAddress);
        setNewAddress('');
        setLoading(false);
    };

    // Bank Accounts
    const [newBank, setNewBank] = useState({ bank_name: '', account_name: '', iban: '' });
    const handleAddBank = async () => {
        if (!newBank.bank_name || !newBank.iban) return;
        setLoading(true);
        await addAgencyBankAccount(newBank.bank_name, newBank.account_name, newBank.iban);
        setNewBank({ bank_name: '', account_name: '', iban: '' });
        setLoading(false);
    };

    return (
        <div className="space-y-8">
            {/* Main Info Card */}
            <Card className="border-l-4 border-[#001a4f] shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-gray-100/50 pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl text-[#001a4f]">
                        <div className="p-2 bg-[#001a4f]/10 rounded-lg">
                            <LucideBuilding className="h-6 w-6 text-[#001a4f]" />
                        </div>
                        Temel Firma Bilgileri
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleMainUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Firma Adı</label>
                            <Input
                                value={settings.firm_name}
                                onChange={e => setSettings({ ...settings, firm_name: e.target.value })}
                                placeholder="Örn: Üstün Patent A.Ş."
                                className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20 transition-all h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Email Adresi</label>
                            <Input
                                value={settings.email}
                                onChange={e => setSettings({ ...settings, email: e.target.value })}
                                placeholder="info@ustunpatent.com"
                                className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20 transition-all h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Vergi Dairesi</label>
                            <Input
                                value={settings.tax_office}
                                onChange={e => setSettings({ ...settings, tax_office: e.target.value })}
                                className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20 transition-all h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Vergi Numarası</label>
                            <Input
                                value={settings.tax_number}
                                onChange={e => setSettings({ ...settings, tax_number: e.target.value })}
                                className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20 transition-all h-11"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end pt-2">
                            <Button type="submit" disabled={loading} className="bg-[#001a4f] hover:bg-[#001a4f]/90 text-white min-w-[140px] h-11">
                                {loading ? <LucideLoader2 className="animate-spin h-4 w-4 mr-2" /> : <LucideSave className="h-4 w-4 mr-2" />}
                                Değişiklikleri Kaydet
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Phones */}
                <Card className="border-l-4 border-[#001a4f] shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-gray-100/50 pb-4">
                        <CardTitle className="flex items-center gap-3 text-lg text-[#001a4f]">
                            <div className="p-2 bg-[#001a4f]/10 rounded-lg">
                                <LucidePhone className="h-5 w-5 text-[#001a4f]" />
                            </div>
                            Telefon Numaraları
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {data.phones.map(phone => (
                                <div key={phone.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors shadow-sm group">
                                    <span className="font-medium text-gray-700">{phone.phone_number}</span>
                                    <button onClick={() => removeAgencyPhone(phone.id)} className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                                        <LucideTrash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={newPhone}
                                onChange={e => setNewPhone(e.target.value)}
                                placeholder="+90 212 ..."
                                className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20"
                            />
                            <Button size="icon" onClick={handleAddPhone} disabled={loading} className="bg-[#001a4f] text-white hover:bg-[#001a4f]/90 shrink-0">
                                <LucidePlus size={18} />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Addresses */}
                <Card className="border-l-4 border-[#001a4f] shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-gray-100/50 pb-4">
                        <CardTitle className="flex items-center gap-3 text-lg text-[#001a4f]">
                            <div className="p-2 bg-[#001a4f]/10 rounded-lg">
                                <LucideMapPin className="h-5 w-5 text-[#001a4f]" />
                            </div>
                            Adresler
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {data.addresses.map(addr => (
                                <div key={addr.id} className="flex items-start justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors shadow-sm group">
                                    <span className="text-sm break-words flex-1 pr-2 text-gray-700 leading-relaxed">{addr.address}</span>
                                    <button onClick={() => removeAgencyAddress(addr.id)} className="text-gray-400 hover:text-red-600 shrink-0 mt-0.5 transition-colors opacity-0 group-hover:opacity-100">
                                        <LucideTrash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={newAddress}
                                onChange={e => setNewAddress(e.target.value)}
                                placeholder="Adres giriniz..."
                                className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20"
                            />
                            <Button size="icon" onClick={handleAddAddress} disabled={loading} className="bg-[#001a4f] text-white hover:bg-[#001a4f]/90 shrink-0">
                                <LucidePlus size={18} />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bank Accounts */}
            <Card className="border-l-4 border-[#001a4f] shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-gray-100/50 pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg text-[#001a4f]">
                        <div className="p-2 bg-[#001a4f]/10 rounded-lg">
                            <LucideCreditCard className="h-5 w-5 text-[#001a4f]" />
                        </div>
                        Banka Hesapları
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {data.bankAccounts.map(acc => (
                            <div key={acc.id} className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-200 hover:border-blue-300 shadow-sm relative group transition-all">
                                <button
                                    onClick={() => removeAgencyBankAccount(acc.id)}
                                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm"
                                >
                                    <LucideTrash2 size={16} />
                                </button>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-8 w-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                                        TR
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{acc.bank_name}</div>
                                        {acc.account_name && <div className="text-xs text-gray-500">{acc.account_name}</div>}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 font-mono tracking-wide break-all p-2 bg-gray-50 rounded border border-gray-100">
                                    {acc.iban}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-50/50 p-5 rounded-xl border border-dashed border-gray-300">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="w-full">
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block ml-1">Banka Adı</label>
                                <Input
                                    value={newBank.bank_name}
                                    onChange={e => setNewBank({ ...newBank, bank_name: e.target.value })}
                                    placeholder="Örn: Garanti Bankası"
                                    className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20"
                                />
                            </div>
                            <div className="w-full">
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block ml-1">Hesap Adı</label>
                                <Input
                                    value={newBank.account_name}
                                    onChange={e => setNewBank({ ...newBank, account_name: e.target.value })}
                                    placeholder="Örn: Şirket Hesabı"
                                    className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20"
                                />
                            </div>
                            <div className="w-full">
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block ml-1">IBAN Numarası</label>
                                <Input
                                    value={newBank.iban}
                                    onChange={e => setNewBank({ ...newBank, iban: e.target.value })}
                                    placeholder="TR..."
                                    className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20 font-mono"
                                />
                            </div>
                            <Button onClick={() => handleAddBank()} disabled={loading} className="shrink-0 w-full md:w-auto bg-[#001a4f] text-white hover:bg-[#001a4f]/90 h-10 px-6">
                                <LucidePlus className="h-4 w-4 mr-2" />
                                Hesap Ekle
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
