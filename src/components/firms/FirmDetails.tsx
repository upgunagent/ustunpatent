'use client';

import { useState } from 'react';
import Link from 'next/link';
import ContractModal from './ContractModal';
import TrademarkForm from './TrademarkForm';
import { LucideBuilding2, LucideUser, LucidePlus, LucideExternalLink, LucidePhone, LucideMail, LucideGlobe, LucideShieldCheck, LucideFileText } from 'lucide-react';
import EditableField from '../ui/editable-field';
import { SECTORS } from '@/constants/sectors';
import { getFirmHistory, updateActionStatus } from '@/actions/history';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { LucideHistory, LucideCheckCircle, LucideXCircle, LucideClock, LucideEye, LucideTrash2 } from 'lucide-react';

// Helper to format dates
const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
};


export default function FirmDetails({ firm, trademarks, agencySettings }: { firm: any, trademarks: any[], agencySettings?: any }) {
    const [isTrademarkModalOpen, setIsTrademarkModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [contractAction, setContractAction] = useState<any>(null);
    const [editingTrademark, setEditingTrademark] = useState<any>(null);
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
                            <p className="font-medium">{firm.phone || '-'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <LucideMail className="text-white/60 mt-1" size={20} />
                        <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">E-posta</p>
                            <p className="font-medium">{firm.email || '-'}</p>
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
                        <LucideUser className="text-white/60 mt-1" size={20} />
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
                                        <EditableField firmId={firm.id} field="individual_address" value={firm.individual_address} multiline label="Adres" />
                                    </div>
                                </>
                            )}

                            <div>
                                <EditableField firmId={firm.id} field="sector" value={firm.sector} options={SECTORS} label="Sektör" />
                            </div>

                            <hr className="my-2" />

                            <div className="grid grid-cols-2 gap-4">
                                <EditableField firmId={firm.id} field="authority_name" value={firm.authority_name} label="Yetki İsmi" />
                                <EditableField firmId={firm.id} field="tpmk_owner_no" value={firm.tpmk_owner_no} label="TPMK Sahip No" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <EditableField firmId={firm.id} field="phone" value={firm.phone} label="Telefon" />
                                <EditableField firmId={firm.id} field="email" value={firm.email} label="E-posta" />
                            </div>

                            <div>
                                <EditableField firmId={firm.id} field="website" value={firm.website} label="Web Sitesi" />
                            </div>
                            <div>
                                <EditableField firmId={firm.id} field="representative" value={firm.representative} label="Müşteri Temsilcisi" />
                            </div>
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
                                                    <button
                                                        onClick={() => {
                                                            setEditingTrademark(t);
                                                            setIsTrademarkModalOpen(true);
                                                        }}
                                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:ring-offset-2 transition-all"
                                                    >
                                                        İncele/Düzenle
                                                    </button>
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
                                    history.map((action) => (
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
                                                                setContractAction(action);
                                                                setIsContractModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
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

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">İçerik</label>
                                    <div
                                        className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 border border-gray-100 overflow-auto max-h-[400px]"
                                        dangerouslySetInnerHTML={{ __html: previewAction.metadata?.full_content || previewAction.metadata?.content_preview || 'İçerik bulunamadı.' }}
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
