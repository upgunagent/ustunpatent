'use client';

import { useState } from 'react';
import { LucideSearch, LucideCalendar, LucideUser, LucideFileText, LucidePlus } from 'lucide-react';
import { WatchedTrademark } from '@/actions/watched-marks';
import RenewContractModal from './RenewContractModal';

interface WatchedMarksTableProps {
    marks: WatchedTrademark[];
    agencySettings: any;
}

export default function WatchedMarksTable({ marks, agencySettings }: WatchedMarksTableProps) {
    const [selectedMark, setSelectedMark] = useState<WatchedTrademark | null>(null);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);

    const handleCreateContract = (mark: WatchedTrademark) => {
        setSelectedMark(mark);
        setIsContractModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsContractModalOpen(false);
        setSelectedMark(null);
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">Hak Sahibi</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Marka Bilgileri</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Tescil & Sınıf</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">İzleme Detayları</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Danışman</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {marks.length > 0 ? (
                                marks.map((mark) => (
                                    <tr key={mark.id} className="bg-white hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="flex flex-col">
                                                <span>{mark.rights_owner}</span>
                                                <span className="text-xs text-gray-400 font-normal mt-1">{mark.application_no}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="font-medium text-[#001a4f]">{mark.mark_name}</div>
                                                <div className="flex items-start gap-1 text-xs text-gray-500">
                                                    <LucideSearch size={12} className="mt-0.5 shrink-0" />
                                                    <span className="italic">{mark.watched_keywords}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5" title="Marka Sınıfları">
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-200">
                                                        Sınıf: {mark.classes || '-'}
                                                    </span>
                                                </div>
                                                {mark.registration_date && (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500" title="Tescil Tarihi">
                                                        <LucideCalendar size={12} />
                                                        {new Date(mark.registration_date).toLocaleDateString('tr-TR')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2 text-xs">
                                                <div className="grid grid-cols-[100px_1fr] gap-1">
                                                    <span className="text-gray-500">Başlangıç Bülten:</span>
                                                    <span className="font-medium text-gray-900">{mark.start_bulletin_no || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-[100px_1fr] gap-1">
                                                    <span className="text-gray-500 text-nowrap">Son İzlenen Bülten:</span>
                                                    <span className={`font-medium ${mark.last_bulletin_no !== '-' ? 'text-green-600' : 'text-gray-400'}`}>
                                                        {mark.last_bulletin_no}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-1">
                                                    <span className="text-gray-500" title="İzleme Başlangıç">{mark.watch_start_date ? new Date(mark.watch_start_date).toLocaleDateString('tr-TR') : '-'}</span>
                                                    <span className="text-gray-300">→</span>
                                                    <span className="text-gray-500" title="İzleme Bitiş">{mark.watch_end_date ? new Date(mark.watch_end_date).toLocaleDateString('tr-TR') : '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <LucideUser size={14} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{mark.consultant_name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleCreateContract(mark)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                            >
                                                <LucidePlus size={12} />
                                                Sözleşme Oluştur
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <LucideFileText className="w-8 h-8 text-gray-300" />
                                            <p>İzlenen aktif marka bulunamadı.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isContractModalOpen && selectedMark && (
                <RenewContractModal
                    onClose={handleCloseModal}
                    trademark={selectedMark}
                    firmEmail={selectedMark.firm_email}
                    firmId={selectedMark.firm_id}
                    agencySettings={agencySettings}
                />
            )}
        </>
    );
}
