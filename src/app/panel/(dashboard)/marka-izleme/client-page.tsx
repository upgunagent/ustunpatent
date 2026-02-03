

'use client';


import { useState, useMemo, useTransition, useEffect, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LucideSearch, LucideShieldCheck, LucideDownload, LucideX } from 'lucide-react';
import BulletinTable, { BulletinMark } from '@/components/bulletins/BulletinTable';
import PaginationControl from '@/components/bulletins/PaginationControl';
import { calculateBrandSimilarity } from '@/lib/brand-similarity';
import { generateBrandComparisonPDF } from '@/lib/brand-comparison-pdf';
import { LucideMail, LucideFileText, LucideTrash2, LucideSend } from 'lucide-react';
import { sendTrademarkNotification } from '@/actions/mail';
import { toast } from 'sonner';

import { FirmCombobox } from '@/components/firms/FirmCombobox';
import { getFirmTrademarks, getFirm } from '@/actions/firms';
import { searchBulletinMarks } from '@/actions/bulletins';

interface BulletinClientPageProps {
    initialData: BulletinMark[];
    totalCount: number;
    currentPage: number;
    limit: number;
    isSearchMode: boolean;
    bulletinOptions: string[];
}

export default function BulletinClientPage({ initialData, totalCount, currentPage, limit, isSearchMode, bulletinOptions }: BulletinClientPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Local State
    const [selectedBulletin, setSelectedBulletin] = useState<string>('');
    const [selectedFirmId, setSelectedFirmId] = useState<string>('');
    const [selectedFirm, setSelectedFirm] = useState<any>(null);
    const [firmTrademarks, setFirmTrademarks] = useState<any[]>([]);
    const [loadingTrademarks, setLoadingTrademarks] = useState(false);
    const [searchedMarkName, setSearchedMarkName] = useState('');
    const [searchResults, setSearchResults] = useState<BulletinMark[]>([]);
    const [searchedClasses, setSearchedClasses] = useState<string[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pdfFilename, setPdfFilename] = useState<string>('marka-karsilastirma.pdf');

    // New States for Keywords
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [currentWatchedMark, setCurrentWatchedMark] = useState<any>(null);

    // Mail Queue State
    const [mailQueue, setMailQueue] = useState<any[]>([]);
    const [isMailModalOpen, setIsMailModalOpen] = useState(false);
    const [mailSubject, setMailSubject] = useState('');
    const [mailContent, setMailContent] = useState('');
    const [isSendingMail, setIsSendingMail] = useState(false);

    // Client-side pagination state
    const [clientPage, setClientPage] = useState(1);
    const clientLimit = 50;

    // Reset URL params on mount
    useEffect(() => {
        // Clear URL if it has params
        if (searchParams.toString()) {
            router.replace('/panel/marka-izleme');
        }
    }, []);

    // Fetch trademarks when firm is selected
    useEffect(() => {
        if (selectedFirmId) {
            setLoadingTrademarks(true);
            getFirmTrademarks(selectedFirmId)
                .then(setFirmTrademarks)
                .finally(() => setLoadingTrademarks(false));

            getFirm(selectedFirmId).then(setSelectedFirm);
        } else {
            setFirmTrademarks([]);
            setSelectedFirm(null);
        }
    }, [selectedFirmId]);

    const toggleExpand = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCompare = async (similarMark: BulletinMark) => {
        const watchedMark = currentWatchedMark || firmTrademarks.find(t => t.name === searchedMarkName);
        if (!watchedMark) {
            console.error("Watched mark not found");
            return;
        }
        const url = await generateBrandComparisonPDF(watchedMark, similarMark, selectedFirm);
        setPreviewUrl(url.toString()); // Keep preview URL
        setPdfFilename(`${watchedMark.name} - ${similarMark.mark_text_540}.pdf`);
        // Store temporary data for adding to mail queue if requested
        (window as any).currentPDFData = {
            watchedMark,
            similarMark,
            firm: selectedFirm
        };
    };

    const handleAddToMailQueue = async () => {
        const data = (window as any).currentPDFData;
        if (!data) return;

        try {
            // Regenerate Blob (since previewUrl is just a string, we want a fresh Blob to store)
            // Or retrieve blob from url if possible? 
            // Better to regenerate to be safe and consistent.
            const blobUrl = await generateBrandComparisonPDF(data.watchedMark, data.similarMark, data.firm);
            const response = await fetch(blobUrl);
            const blob = await response.blob();

            const filename = `${data.watchedMark.name}-${data.similarMark.mark_text_540}.pdf`;

            setMailQueue(prev => [...prev, {
                id: Date.now(),
                blob,
                filename,
                similarMarkName: data.similarMark.mark_text_540,
                watchedMarkName: data.watchedMark.name,
                watchedMarkClasses: data.watchedMark.classes,
                bulletinNo: data.similarMark.issue_no // Store bulletin No
            }]);

            toast.success('Rapor mail kuyruğuna eklendi.');
            setPreviewUrl(null); // Close preview
        } catch (e) {
            console.error(e);
            toast.error('Rapor eklenirken hata oluştu.');
        }
    };

    const openMailModal = () => {
        if (mailQueue.length === 0) {
            toast.error('Mail kuyruğu boş.');
            return;
        }

        const date = new Date();
        const monthName = date.toLocaleString('tr-TR', { month: 'long' });
        const year = date.getFullYear();
        const dateStr = date.toLocaleDateString('tr-TR');
        // Calculate Bulletin No String
        const bulletinNumbers = Array.from(new Set(mailQueue.map(item => item.bulletinNo))).filter(Boolean).sort();
        let bulletinNoStr = '';
        if (bulletinNumbers.length === 0) {
            bulletinNoStr = selectedBulletin || '...';
        } else if (bulletinNumbers.length === 1) {
            bulletinNoStr = bulletinNumbers[0];
        } else {
            const last = bulletinNumbers.pop();
            bulletinNoStr = `${bulletinNumbers.join(', ')} ve ${last}`;
        }
        const uniqueWatchedMarks = new Map();
        mailQueue.forEach(item => {
            if (!uniqueWatchedMarks.has(item.watchedMarkName)) {
                uniqueWatchedMarks.set(item.watchedMarkName, item.watchedMarkClasses);
            }
        });

        const markDetailsParts: string[] = [];
        uniqueWatchedMarks.forEach((classes, name) => {
            markDetailsParts.push(`${name} / ${classes}`);
        });
        const markDetailsStr = markDetailsParts.join(', ');

        // Consultant
        // Try to find consultant from one of the queue items or firm
        // For simplicity use firm rep or empty
        const consultantName = selectedFirm?.representative || '(Danışman Adı)';

        const similarMarksList = mailQueue.map(item => `<li><b>${item.similarMarkName}</b> (${item.watchedMarkName} markasının benzer markası)</li>`).join('');

        const subject = `Bülten Takibi/${year} ${monthName} Ayı Benzer Markaya Rastlanıldı !!!`;

        const content = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333;"><p style="margin: 0 0 10px 0;">Merhabalar,</p><p style="margin: 0 0 10px 0;">Türk Patent ve Marka Kurumu nezdinde adınıza başvurusu yapılmış/ tescillenmiş olan markalarınızın, 6769 Sayılı Sınai Mülkiyet Kanunu hükümlerine göre düzenli olarak yayınlanan Resmi Marka Bültenlerinde izlemesini yapıyoruz.</p><p style="margin: 0 0 10px 0;"><b>${dateStr} tarih ve ${bulletinNoStr} sayılı</b> Resmi Marka Bülteninde yaptığımız <b style="color: #c00000;">inceleme neticesinde hak sahibi olduğunuz ${markDetailsStr} sınıflarında (eş/benzer) marka başvurusu tespit edilmiştir. Detaylı bilgi ekte iletilmiştir.</b></p><p style="margin: 0 0 10px 0;"><b style="color: #c00000;">Markalarınız açısından risk teşkil ettiği kanaatindeyseniz tescili alınmadan gerekli itirazın yapılması önerimizdir.<br>Süreli işlemler olduğundan konu ile alakalı geri bildirim yapmanızı rica ederiz.</b></p><p style="margin: 0 0 5px 0;"><b>Markalar;</b></p><ul style="margin: 0 0 15px 0; padding-left: 20px; list-style-type: disc;">${similarMarksList}</ul><p style="margin: 0 0 10px 0;">Saygılarımla,</p><br><img src="/images/mail-signature.png?v=${new Date().getTime()}" alt="Üstün Patent" style="max-width: 300px; height: auto;" /></div>`;

        setMailSubject(subject);
        setMailContent(content);
        setIsMailModalOpen(true);
    };

    const handleNoMatchMail = () => {
        const date = new Date();
        const monthName = date.toLocaleString('tr-TR', { month: 'long' });
        const year = date.getFullYear();
        const dateStr = date.toLocaleDateString('tr-TR');
        const bulletinNoStr = '***BÜLTEN NUMARASINI YAZIN***';

        const marksList = firmTrademarks.map(t => `<li style="margin-bottom: 5px;">${t.name}</li>`).join('');

        const subject = `Bülten Takibi/${year} ${monthName} Ayı Benzer Markaya Rastlanılmadı`;

        const content = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333;">
            <p style="margin: 0 0 10px 0;">Merhabalar,</p>
            <p style="margin: 0 0 10px 0;">Türk Patent ve Marka Kurumu nezdinde adınıza başvurusu yapılmış/ tescillenmiş olan markanızın, 6769 Sayılı Sınai Mülkiyet Kanunu hükümlerine göre düzenli olarak yayınlanan Resmi Marka Bültenlerinde izlemesini yapıyoruz.</p>
            <p style="margin: 0 0 10px 0;"><b>${dateStr} tarih ve ${bulletinNoStr} sayılı</b> Resmi Marka Bülteninde yaptığımız inceleme neticesinde aşağıda bilgileri bulunan markanıza benzer hiçbir marka başvurusu bulunamamıştır.</p>
            <p style="margin: 0 0 5px 0;"><b>Markalar;</b></p>
            <ul style="margin: 0 0 15px 0; padding-left: 20px; list-style-type: disc;">
                ${marksList}
            </ul>
            <p style="margin: 0 0 10px 0;">Saygılarımla,</p>
            <br>
            <img src="/images/mail-signature.png?v=${new Date().getTime()}" alt="Üstün Patent" style="max-width: 300px; height: auto;" />
        </div>`;

        setMailSubject(subject);
        setMailContent(content);
        setMailQueue([]); // Clear queue as this is a "no match" mail
        setIsMailModalOpen(true);
    };

    const handleSendMail = async () => {
        console.log('Send mail clicked'); // Debug
        if (!selectedFirmId) {
            console.error('No firm selected');
            toast.error('Lütfen bir firma seçiniz.');
            return;
        }

        setIsSendingMail(true);

        try {
            console.log('Preparing attachments...');

            // Helper to clean base64 string
            const blobToBase64 = (blob: Blob): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64String = reader.result as string;
                        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
                        const base64Content = base64String.split(',')[1];
                        resolve(base64Content);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            };

            const attachmentData = await Promise.all(mailQueue.map(async (item) => {
                if (item.blob) {
                    const content = await blobToBase64(item.blob);
                    return {
                        filename: item.filename,
                        content: content
                    };
                }
                return null;
            }));

            // Filter out nulls
            const validAttachments = attachmentData.filter(Boolean) as { filename: string, content: string }[];

            if (validAttachments.length === 0 && mailQueue.length > 0) {
                console.error('Failed to process attachments');
                throw new Error('Dosyalar işlenemedi.');
            }

            console.log('Sending to server action...', validAttachments.length, 'attachments');
            const result = await sendTrademarkNotification(selectedFirmId, mailContent, mailSubject, validAttachments);
            console.log('Server response:', result);

            if (result && result.success) {
                console.log('Sending success toast...');
                toast.success('Benzer marka karşılaştırma raporlarınız firmaya iletilmiştir.', {
                    duration: 5000,
                });
                setMailQueue([]);
                setIsMailModalOpen(false);
            } else {
                throw new Error(result?.message || 'İşlem başarısız oldu.');
            }
        } catch (error: any) {
            console.error('Mail send error:', error);
            toast.error(error.message || 'Mail gönderilemedi.');
        } finally {
            setIsSendingMail(false);
        }
    };

    const removeFromQueue = (id: number) => {
        setMailQueue(prev => prev.filter(item => item.id !== id));
    };

    const handleFirmChange = (firmId: string) => {
        setSelectedFirmId(firmId);

        // Update URL
        setSearchedMarkName(''); // Clear search state
        setSearchResults([]);
        setSearchedClasses([]);
        setExpandedRows({}); // Reset expansions

        // Don't clutter URL with firmId if user wants clean reset,
        // but if we want basic persist we could keeps it.
        // User asked for "sıfırlama" on refresh, so keeping URL clean is safest.
        router.replace('/panel/marka-izleme');
    };

    const handleSearch = (markName: string, classesStr?: string, parentMark?: any) => {
        if (!selectedBulletin) {
            alert('Lütfen önce bir bülten seçiniz.');
            return;
        }

        // Parse classes
        let classList: string[] = [];
        if (classesStr) {
            classList = classesStr.split(',')
                .map(c => c.trim())
                .filter(c => /^\d{2}$/.test(c) || /^\d$/.test(c))
                .map(c => c.length === 1 ? '0' + c : c);
        }

        setSearchedMarkName(markName);
        setSearchedClasses(classList);
        if (parentMark) {
            setCurrentWatchedMark(parentMark);
        } else {
            // Fallback if searched from somewhere else (unlikely now)
            setCurrentWatchedMark(firmTrademarks.find(t => t.name === markName));
        }

        startTransition(async () => {
            // If searching a keyword, markName is the keyword.
            const results = await searchBulletinMarks(markName);
            setSearchResults(results);
            setClientPage(1);
        });
    };

    // Filter Logic
    const filteredData = useMemo(() => {
        // Use searchResults if we have a search name, otherwise initialData (default view)
        let processed = searchedMarkName ? [...searchResults] : [...initialData];

        // 1. Bulletin No Filter (Client Side if needed, but usually server handles fetching based on search context)
        if (selectedBulletin) {
            processed = processed.filter(item => String(item.issue_no).trim() == String(selectedBulletin).trim());
        }

        // 2 Class Filtering
        if (searchedClasses.length > 0) {
            processed = processed.filter(item => {
                if (!item.nice_classes_511) return false;
                const matches = item.nice_classes_511.match(/\b\d{2}\b/g);
                const itemClasses: string[] = matches ? Array.from(matches) : [];
                return searchedClasses.some(cls => itemClasses.includes(cls));
            });
        }

        // 3. Similarity & Sorting
        if (searchedMarkName) {
            processed = processed.map(item => {
                const markName = item.mark_text_540 || '';
                const similarity = calculateBrandSimilarity(searchedMarkName, markName);
                return { ...item, similarity };
            });

            processed = processed.filter(item => (item.similarity?.score || 0) > 10);

            processed.sort((a, b) => {
                const scoreA = a.similarity?.score || 0;
                const scoreB = b.similarity?.score || 0;
                if (scoreA !== scoreB) return scoreB - scoreA;
                return (a.mark_text_540?.length || 0) - (b.mark_text_540?.length || 0);
            });
        }

        return processed;
    }, [initialData, searchResults, selectedBulletin, searchedMarkName, searchedClasses]);

    // Pagination Logic
    const paginatedData = useMemo(() => {
        if (!searchedMarkName) return filteredData; // If not searching (default view), filteredData is already paginated by server? No, server returns 50.
        // Actually initializedData is 50 items. 
        // If we search, searchResults is ALL matching items (up to limit).
        // So we need client side pagination for search results.

        const startIndex = (clientPage - 1) * clientLimit;
        return filteredData.slice(startIndex, startIndex + clientLimit);
    }, [filteredData, clientPage, searchedMarkName]);

    const totalPages = searchedMarkName
        ? Math.ceil(filteredData.length / clientLimit)
        : Math.ceil(totalCount / limit);

    const displayedPage = searchedMarkName ? clientPage : currentPage;

    const handlePageChange = (newPage: number) => {
        if (searchedMarkName) {
            setClientPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // For default view, we might still use URL params if we wanted pagination...
            // But user wants CLEAN page on refresh. 
            // If we use router.push here it might trigger the 'useEffect reset'.
            // For now, let's assume default view pagination isn't the priority or we use client state too?
            // Actually the requirement is mainly about the Search Flow being fast.
            // Let's keep server pagination for default view but maybe that conflicts with reset logic?
            // If we use router.push, useEffect sees params and resets? 
            // Yes. So if use router.push(?page=2), useEffect will clear it.
            // FIX: check if ONLY page param is present?
            // Or just allow page param?
            // User said "sayfayı sıfırlaması lazım".
            // Let's assume pagination for default view isn't critical or we make it client side too if data is small.
            // Default data is 50 items.
            // If we want pagination for default view, we should probably fetch it client side too or allow 'page' param.

            // To be safe and simple: Let's allow 'page' param in the reset logic if needed, 
            // BUT user said "listeleme yapmadan" (without listing).
            // So maybe initial view SHOULD BE EMPTY or just the filter selections.
            // If initialData is 50 items, but user says "without listing", maybe we shouldn't show the table at all until search?
            // "listeleme yapmadan bülten no ve firma seçimi yaptırması lazım".
            // This suggests the initial table should be HIDDEN or EMPTY.

            // Let's execute logic: Only show table if `searchedMarkName` is present OR maybe if we explicitly decide to show default content.
            // Current code shows filteredData. 
            // I will keep showing it but maybe user will ignore it. 
            // Crucially I must fix the interaction.

            startTransition(() => {
                const params = new URLSearchParams(searchParams);
                params.set('page', String(newPage));
                router.push(`?${params.toString()}`);
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Filter Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bülten No</label>
                        <select
                            value={selectedBulletin}
                            onChange={(e) => setSelectedBulletin(e.target.value)}
                            className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-[#001a4f] focus:outline-none focus:ring-1 focus:ring-[#001a4f]"
                        >
                            <option value="">Bülten Seçiniz</option>
                            {bulletinOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Firma Seç</label>
                        <FirmCombobox
                            value={selectedFirmId}
                            onChange={handleFirmChange}
                        />
                    </div>
                </div>

                {/* Selected Firm Trademarks */}
                {selectedFirmId && (
                    <div className="border-t pt-6 animation-fade-in">
                        <h3 className="font-semibold text-gray-900 mb-4">Firmanın Markaları</h3>
                        {loadingTrademarks ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-blue-600" />
                            </div>
                        ) : firmTrademarks.length > 0 ? (
                            <>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 w-10"></th>
                                                <th className="px-4 py-3">Logo</th>
                                                <th className="px-4 py-3">Marka Adı</th>
                                                <th className="px-4 py-3">Başvuru No</th>
                                                <th className="px-4 py-3">Sınıflar</th>
                                                <th className="px-4 py-3">Durum</th>
                                                <th className="px-4 py-3 text-right">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {firmTrademarks.map((t) => (
                                                <Fragment key={t.id}>
                                                    <tr className="bg-white border-b hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            {t.search_keywords && (
                                                                <button
                                                                    onClick={() => toggleExpand(t.id)}
                                                                    className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-bold text-lg leading-none pb-0.5"
                                                                >
                                                                    {expandedRows[t.id] ? '-' : '+'}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="h-8 w-8 relative bg-gray-100 rounded border overflow-hidden">
                                                                {t.logo_url ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img src={t.logo_url} alt={t.name} className="object-contain w-full h-full" />
                                                                ) : <span className="text-[9px] flex items-center justify-center h-full text-gray-400">Yok</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                                                        <td className="px-4 py-3">{t.application_no}</td>
                                                        <td className="px-4 py-3">{t.classes || '-'}</td>
                                                        <td className="px-4 py-3">
                                                            {t.watch_agreement ? (
                                                                <span className="text-green-600 flex items-center gap-1 text-xs font-medium">
                                                                    <LucideShieldCheck size={14} /> İzleniyor
                                                                </span>
                                                            ) : <span className="text-gray-400 text-xs text-nowrap">Sözleşme Yok</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => handleSearch(t.name, t.classes, t)}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#001a4f] text-white text-xs font-medium rounded hover:bg-[#002366] transition-colors"
                                                            >
                                                                <LucideSearch size={12} />
                                                                Ara
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {/* Keyword Sub-rows */}
                                                    {expandedRows[t.id] && t.search_keywords && (
                                                        t.search_keywords.split(',').filter(Boolean).map((keyword: string, kIdx: number) => (
                                                            <tr key={`${t.id}-kw-${kIdx}`} className="bg-gray-50 border-b">
                                                                <td className="px-4 py-2 border-r border-gray-100"></td>
                                                                <td className="px-4 py-2" colSpan={5}>
                                                                    <div className="flex items-center gap-2 pl-4 border-l-2 border-blue-200">
                                                                        <span className="text-xs text-gray-500 font-medium">Arama Kelimesi:</span>
                                                                        <span className="text-sm font-semibold text-gray-700">{keyword}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <button
                                                                        onClick={() => handleSearch(keyword, t.classes, t)} // Search with KEYWORD but pass PARENT trademark context
                                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        <LucideSearch size={12} />
                                                                        Ara
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleNoMatchMail}
                                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 border border-red-700 transition-colors flex items-center gap-2"
                                    >
                                        <LucideMail size={16} />
                                        Benzer Marka Bulunamadı Maili At
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                Bu firmaya ait kayıtlı marka bulunamadı.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Results Section */}
            {searchedMarkName && (
                <div className="bg-white rounded-lg border border-gray-200 min-h-[400px]">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <span className="text-sm font-medium text-gray-700">
                            &quot;{searchedMarkName}&quot; için Benzerlik Sonuçları ({filteredData.length})
                        </span>
                    </div>

                    {isPending ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px]">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            <p className="mt-2 text-sm text-gray-500">Analiz ediliyor...</p>
                        </div>
                    ) : paginatedData.length > 0 ? (
                        <BulletinTable
                            data={paginatedData}
                            highlightedClasses={searchedClasses}
                            onCompare={handleCompare}
                        />
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            Benzer marka bulunamadı.
                        </div>
                    )}
                </div>
            )}

            {searchedMarkName && paginatedData.length > 0 && (
                <div className="flex justify-end">
                    <PaginationControl
                        currentPage={displayedPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}

            {/* PDF Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold text-lg">Marka Karşılaştırma Raporu</h3>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <LucideX className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100 p-4 overflow-hidden relative">
                            {/* Loading State or Iframe */}
                            <iframe
                                src={previewUrl}
                                className="w-full h-full rounded border bg-white shadow-sm"
                                title="PDF Önizleme"
                            />
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                            >
                                Kapat
                            </button>
                            <a
                                href={previewUrl}
                                download={pdfFilename}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#001a4f] rounded hover:bg-[#002366] flex items-center gap-2"
                            >
                                <LucideDownload size={16} />
                                İndir
                            </a>
                            <button
                                onClick={handleAddToMailQueue}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 flex items-center gap-2"
                            >
                                <LucideMail size={16} />
                                Mail İçin Ekle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mail Preview Modal */}
            {
                isMailModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col relative animate-in zoom-in-95">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="font-semibold text-lg">Mail Gönderimi Önizleme</h3>
                                <button onClick={() => setIsMailModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                                    <LucideX className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kime</label>
                                    <div className="p-2 bg-gray-50 rounded border text-sm">
                                        {selectedFirm?.email || selectedFirm?.info_email || selectedFirm?.contact_email || 'Kayıtlı e-posta yok'}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Konu</label>
                                    <input
                                        value={mailSubject}
                                        onChange={e => setMailSubject(e.target.value)}
                                        className="w-full p-2 border rounded text-sm focus:outline-blue-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">İçerik</label>
                                    <div
                                        contentEditable
                                        dangerouslySetInnerHTML={{ __html: mailContent }}
                                        onInput={(e) => setMailContent(e.currentTarget.innerHTML)}
                                        className="w-full p-2 border rounded text-sm focus:outline-blue-600 font-sans min-h-[300px] max-h-[500px] overflow-y-auto"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ekler ({mailQueue.length})</label>
                                    <div className="space-y-2">
                                        {mailQueue.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 border rounded text-sm">
                                                <div className="flex items-center gap-2">
                                                    <LucideFileText size={16} className="text-red-500" />
                                                    <span className="truncate max-w-[300px]">{item.filename}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeFromQueue(item.id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <LucideTrash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">


                                <button
                                    onClick={() => setIsMailModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSendMail}
                                    disabled={isSendingMail}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSendingMail ? (
                                        <>
                                            <Loader2 className="animate-spin w-4 h-4" />
                                            <span>Gönderiliyor...</span>
                                        </>
                                    ) : (
                                        <>
                                            <LucideSend size={16} />
                                            <span>Gönder</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Floating Mail Queue Button */}
            {mailQueue.length > 0 && !isMailModalOpen && !previewUrl && (
                <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-5">
                    <button
                        onClick={openMailModal}
                        className="flex items-center gap-3 px-6 py-4 bg-[#001a4f] text-white rounded-full shadow-xl hover:bg-[#002366] transition-all transform hover:scale-105"
                    >
                        <div className="relative">
                            <LucideMail className="w-6 h-6" />
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[#001a4f]">
                                {mailQueue.length}
                            </span>
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">Mail Hazırla</span>
                            <span className="text-[10px] opacity-80">{mailQueue.length} Rapor Eklendi</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
