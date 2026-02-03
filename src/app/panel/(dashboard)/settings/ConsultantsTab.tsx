'use client';

import React, { useState } from 'react';
import { AgencyData, addAgencyConsultant, removeAgencyConsultant } from '@/actions/settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LucideUsers, LucidePlus, LucideTrash2, LucideUser, LucidePhone, LucideMail, LucideBriefcase } from 'lucide-react';

interface Props {
    data: AgencyData;
}

export default function ConsultantsTab({ data }: Props) {
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const [newConsultant, setNewConsultant] = useState({
        name: '',
        title: '',
        email: '',
        phone: ''
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addAgencyConsultant(newConsultant);
            setNewConsultant({ name: '', title: '', email: '', phone: '' });
            setIsAdding(false);
        } catch (err: any) {
            alert('Hata: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-[#001a4f]">Kayıtlı Danışmanlar</h3>
                    <p className="text-sm text-gray-500">Ajansınızda görev yapan danışmanları buradan yönetin.</p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)} className="bg-[#001a4f] text-white hover:bg-[#001a4f]/90 shadow-md transition-all active:scale-95">
                    <LucidePlus className="h-4 w-4 mr-2" />
                    Yeni Danışman Ekle
                </Button>
            </div>

            {isAdding && (
                <Card className="border-l-4 border-[#001a4f] shadow-lg bg-blue-50/30 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-[#001a4f] flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[#001a4f]"></div>
                            Yeni Danışman Bilgileri
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase ml-1">Danışman Adı</label>
                                <Input
                                    required
                                    value={newConsultant.name}
                                    onChange={e => setNewConsultant({ ...newConsultant, name: e.target.value })}
                                    className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20 bg-white"
                                    placeholder="Ad Soyad"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase ml-1">Ünvanı</label>
                                <Input
                                    value={newConsultant.title}
                                    onChange={e => setNewConsultant({ ...newConsultant, title: e.target.value })}
                                    className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20 bg-white"
                                    placeholder="Örn: Kıdemli Marka Vekili"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase ml-1">Email</label>
                                <Input
                                    type="email"
                                    value={newConsultant.email}
                                    onChange={e => setNewConsultant({ ...newConsultant, email: e.target.value })}
                                    className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20 bg-white"
                                    placeholder="email@adres.com"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase ml-1">Telefon</label>
                                <Input
                                    value={newConsultant.phone}
                                    onChange={e => setNewConsultant({ ...newConsultant, phone: e.target.value })}
                                    className="border-gray-300 focus:border-[#001a4f] focus:ring-[#001a4f]/20 bg-white"
                                    placeholder="+90 5..."
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-3 pt-3">
                                <Button type="button" variant="outline" onClick={() => setIsAdding(false)} className="hover:bg-red-50 hover:text-red-600 border-gray-300">İptal</Button>
                                <Button type="submit" disabled={loading} className="bg-[#001a4f] text-white hover:bg-[#001a4f]/90 min-w-[100px]">Kaydet</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.consultants.length === 0 && !isAdding && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <LucideUsers className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="font-medium">Henüz hiç danışman eklenmemiş.</p>
                        <p className="text-sm text-gray-400">Yeni bir danışman eklemek için yukarıdaki butonu kullanın.</p>
                    </div>
                )}

                {data.consultants.map(c => (
                    <Card key={c.id} className="relative group overflow-hidden hover:shadow-xl transition-all border-t-4 border-t-[#001a4f] bg-white">
                        <div className="absolute top-3 right-3 z-10">
                            <button
                                onClick={() => removeAgencyConsultant(c.id)}
                                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                title="Danışmanı Sil"
                            >
                                <LucideTrash2 size={16} />
                            </button>
                        </div>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="h-14 w-14 bg-gradient-to-br from-[#001a4f] to-blue-800 rounded-full flex items-center justify-center shrink-0 shadow-md text-white font-bold text-xl">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-gray-900 text-lg leading-tight">{c.name}</h4>
                                    <p className="text-sm text-[#001a4f] font-medium bg-blue-50 inline-block px-2 py-0.5 rounded">{c.title || 'Danışman'}</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
                                    <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
                                        <LucideMail size={16} />
                                    </div>
                                    <span className="text-gray-600 font-medium truncate">{c.email || '-'}</span>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
                                    <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
                                        <LucidePhone size={16} />
                                    </div>
                                    <span className="text-gray-600 font-medium truncate">{c.phone || '-'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
