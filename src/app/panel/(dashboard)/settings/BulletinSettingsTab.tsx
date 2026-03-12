'use client';

import React, { useState, useEffect } from 'react';
import { LucideTrash2, LucideAlertTriangle, LucideLoader2, LucideShieldAlert, LucideCheckCircle, LucideDatabase, LucideImage } from 'lucide-react';
import { getBulletinStats, deleteBulletinData } from '@/actions/bulletin-settings';

interface Props {
    bulletinOptions: string[];
}

export default function BulletinSettingsTab({ bulletinOptions }: Props) {
    const [selectedBulletin, setSelectedBulletin] = useState('');
    const [stats, setStats] = useState<{ count: number; logoCount: number } | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Delete flow states
    const [step, setStep] = useState<'idle' | 'confirm' | 'password' | 'deleting' | 'done'>('idle');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ deletedRecords: number; deletedLogos: number } | null>(null);

    // Fetch stats when bulletin changes
    useEffect(() => {
        if (selectedBulletin) {
            setLoadingStats(true);
            setStep('idle');
            setError('');
            setResult(null);
            getBulletinStats(selectedBulletin)
                .then(setStats)
                .finally(() => setLoadingStats(false));
        } else {
            setStats(null);
        }
    }, [selectedBulletin]);

    const handleDeleteClick = () => {
        if (!selectedBulletin || !stats || stats.count === 0) return;
        setStep('confirm');
        setError('');
    };

    const handleConfirm = () => {
        setStep('password');
        setPassword('');
        setError('');
    };

    const handlePasswordSubmit = async () => {
        if (!password.trim()) {
            setError('Lütfen şifrenizi girin.');
            return;
        }

        setStep('deleting');
        setError('');

        try {
            const res = await deleteBulletinData(selectedBulletin, password);
            if (res.success) {
                setResult({ deletedRecords: res.deletedRecords || 0, deletedLogos: res.deletedLogos || 0 });
                setStep('done');
                setStats({ count: 0, logoCount: 0 });
            } else {
                setError(res.message);
                setStep('password');
            }
        } catch (e: any) {
            setError(e.message || 'Bir hata oluştu.');
            setStep('password');
        }
    };

    const handleCancel = () => {
        setStep('idle');
        setPassword('');
        setError('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <LucideDatabase className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#001a4f]">Bülten Verisi Yönetimi</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Seçilen bülten numarasına ait tüm marka kayıtlarını ve logolarını veritabanından silebilirsiniz.
                            Bu işlem geri alınamaz.
                        </p>
                    </div>
                </div>

                {/* Bulletin Selector */}
                <div className="max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bülten Numarası Seçin</label>
                    <select
                        value={selectedBulletin}
                        onChange={(e) => setSelectedBulletin(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-10 text-sm focus:border-[#001a4f] focus:outline-none focus:ring-1 focus:ring-[#001a4f]"
                    >
                        <option value="">Bülten No Seçin...</option>
                        {bulletinOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Card */}
            {selectedBulletin && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {loadingStats ? (
                        <div className="flex items-center justify-center py-8">
                            <LucideLoader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            <span className="ml-2 text-gray-500">Yükleniyor...</span>
                        </div>
                    ) : stats && stats.count > 0 ? (
                        <>
                            <h4 className="font-semibold text-gray-900 mb-4">
                                Bülten <span className="text-[#001a4f]">{selectedBulletin}</span> İstatistikleri
                            </h4>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3">
                                    <LucideDatabase className="w-8 h-8 text-blue-600" />
                                    <div>
                                        <p className="text-2xl font-bold text-blue-700">{stats.count.toLocaleString('tr-TR')}</p>
                                        <p className="text-xs text-blue-500">Marka Kaydı</p>
                                    </div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-4 flex items-center gap-3">
                                    <LucideImage className="w-8 h-8 text-purple-600" />
                                    <div>
                                        <p className="text-2xl font-bold text-purple-700">{stats.logoCount.toLocaleString('tr-TR')}</p>
                                        <p className="text-xs text-purple-500">Logo Dosyası</p>
                                    </div>
                                </div>
                            </div>

                            {/* Delete Button */}
                            {step === 'idle' && (
                                <button
                                    onClick={handleDeleteClick}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    <LucideTrash2 size={16} />
                                    Tüm Verileri Sil
                                </button>
                            )}

                            {/* Step 1: Confirm */}
                            {step === 'confirm' && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-5 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-start gap-3">
                                        <LucideAlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="font-semibold text-red-800">Emin misiniz?</h5>
                                            <p className="text-sm text-red-600 mt-1">
                                                Bülten <strong>{selectedBulletin}</strong> numarasına ait{' '}
                                                <strong>{stats.count.toLocaleString('tr-TR')}</strong> marka kaydı ve{' '}
                                                <strong>{stats.logoCount.toLocaleString('tr-TR')}</strong> logo dosyası kalıcı olarak silinecektir.
                                                Bu işlem geri alınamaz!
                                            </p>
                                            <div className="flex gap-3 mt-4">
                                                <button
                                                    onClick={handleConfirm}
                                                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                                >
                                                    Evet, Devam Et
                                                </button>
                                                <button
                                                    onClick={handleCancel}
                                                    className="px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    İptal
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Password */}
                            {step === 'password' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-start gap-3">
                                        <LucideShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-amber-800">Güvenlik Doğrulaması</h5>
                                            <p className="text-sm text-amber-600 mt-1 mb-3">
                                                İşlemi onaylamak için sisteme giriş yaparken kullandığınız şifrenizi girin.
                                            </p>
                                            <div className="max-w-sm">
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                                                    placeholder="Şifrenizi girin..."
                                                    className="w-full rounded-lg border border-amber-300 py-2 px-3 text-sm focus:border-[#001a4f] focus:outline-none focus:ring-1 focus:ring-[#001a4f]"
                                                    autoFocus
                                                />
                                            </div>
                                            {error && (
                                                <p className="text-sm text-red-600 mt-2 font-medium">{error}</p>
                                            )}
                                            <div className="flex gap-3 mt-4">
                                                <button
                                                    onClick={handlePasswordSubmit}
                                                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                                >
                                                    Onayla ve Sil
                                                </button>
                                                <button
                                                    onClick={handleCancel}
                                                    className="px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    İptal
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Deleting */}
                            {step === 'deleting' && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-3">
                                        <LucideLoader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                        <div>
                                            <h5 className="font-semibold text-gray-800">Siliniyor...</h5>
                                            <p className="text-sm text-gray-500">Kayıtlar ve logolar siliniyor. Lütfen bekleyin.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Done */}
                            {step === 'done' && result && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-5 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-start gap-3">
                                        <LucideCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="font-semibold text-green-800">İşlem Tamamlandı!</h5>
                                            <p className="text-sm text-green-600 mt-1">
                                                <strong>{result.deletedRecords.toLocaleString('tr-TR')}</strong> marka kaydı ve{' '}
                                                <strong>{result.deletedLogos.toLocaleString('tr-TR')}</strong> logo dosyası başarıyla silindi.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : stats && stats.count === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <LucideDatabase className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                            <p className="font-medium">Bu bültene ait kayıt bulunamadı.</p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
