"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { BulletinMark } from "./BulletinTable";
import { useEffect } from "react";

interface BulletinDetailModalProps {
    mark: BulletinMark;
    onClose: () => void;
}

export default function BulletinDetailModal({ mark, onClose }: BulletinDetailModalProps) {
    // Prevent document scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('tr-TR');
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Blue Tone from Sidebar (#001a4f) */}
                <div className="bg-[#001a4f] text-white p-4 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-bold">Marka Detayı</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">

                    {/* Top Section: Logo & Basic Info */}
                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* Logo */}
                        <div className="shrink-0 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg w-full sm:w-48 h-48 p-4">
                            {mark.logo_url ? (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={mark.logo_url}
                                        alt={mark.mark_text_540}
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <div className="text-gray-400 text-sm">Logo Yok</div>
                            )}
                        </div>

                        {/* Basic Info Grid */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Marka Adı</label>
                                <div className="text-lg font-bold text-[#001a4f]">{mark.mark_text_540 || '-'}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Başvuru No</label>
                                    <div className="font-medium text-gray-900">{mark.application_no_210 || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Başvuru Tarihi</label>
                                    <div className="font-medium text-gray-900">{mark.application_date_220 || '-'}</div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Marka Sahibi</label>
                                <div className="font-medium text-gray-900">{mark.owner_agent_731 || '-'}</div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Kayıt Tarihi</label>
                                {/* Using created_at or publication_date if available? Usually publication date is what 'Kayıt Tarihi' refers to in bulletin context or registration date. 
                                    Looking at BulletinTable, 'Kayıt Tarihi' column uses 'mark.created_at'.
                                */}
                                <div className="font-medium text-gray-900">{formatDate(mark.created_at)}</div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Details Grid */}
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">Sınıflar</span>
                            </label>
                            <div className="text-sm font-medium text-gray-900">{mark.nice_classes_511 || '-'}</div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Sınıf İçerikleri</label>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                {mark.goods_services_510 || '-'}
                            </div>
                        </div>

                        {mark.excluded_goods_services && (
                            <div>
                                <label className="text-xs font-semibold text-red-500 uppercase tracking-wider block mb-2">Çıkarılan İçerikler</label>
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm text-gray-700 max-h-32 overflow-y-auto">
                                    {mark.excluded_goods_services}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Viyana Sınıfı</label>
                            <div className="font-medium text-gray-900">{mark.viyana_sinifi || '-'}</div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 shrink-0 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
