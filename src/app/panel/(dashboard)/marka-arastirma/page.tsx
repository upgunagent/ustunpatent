"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, FileText, Info, AlertTriangle } from "lucide-react";

export default function TrademarkSearchPage() {
    const [loading, setLoading] = useState(false);
    const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchParams, setSearchParams] = useState({
        searchText: "",
        niceClasses: "",
        holderName: ""
    });
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<{ logs: string[], screenshot: string | null } | null>(null);

    // Detail Modal State
    const [selectedMark, setSelectedMark] = useState<any | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [modalDebug, setModalDebug] = useState<string[]>([]);

    // Session ID for browser reuse
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);
    const [selectedClasses, setSelectedClasses] = useState<number[]>([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const toggleClass = (classNum: number) => {
        setSelectedClasses(prev =>
            prev.includes(classNum)
                ? prev.filter(c => c !== classNum)
                : [...prev, classNum]
        );
    };

    // Client-side filtering logic
    const filteredResults = results.filter(item => {
        if (selectedClasses.length === 0) return true;
        if (!item.niceClasses) return false;

        // Normalize item classes (handle "30, 35", "30/35", "30\n35", etc.)
        const itemClasses = item.niceClasses.toString()
            .split(/[\n,/]+/) // Changed: added slash
            .map((c: string) => c.trim().replace(/^0+/, ''))
            .filter((c: string) => c.length > 0); // Changed: filter empty strings

        // Check if ANY selected class matches
        return selectedClasses.some(cls => {
            const clsStr = cls.toString().replace(/^0+/, '');
            return itemClasses.includes(clsStr);
        });
    });

    // Loading timer effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (loading) {
            setShowLongWaitMessage(false);
            timer = setTimeout(() => {
                setShowLongWaitMessage(true);
            }, 10000);
        } else {
            setShowLongWaitMessage(false);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults([]);
        setDebugInfo(null);
        setSessionId(null); // Clear old session
        setCurrentPage(1); // Reset page
        setTotalRecords(0); // Reset count

        try {
            const res = await fetch("/api/patent-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "search",
                    params: {
                        searchText: searchParams.searchText,
                        // Backend'e sınıf filtresi göndermiyoruz (Tümünü getirsin diye).
                        // Filtrelemeyi Frontend tarafında (filteredResults) yapıyoruz.
                        niceClasses: "",
                        holderName: searchParams.holderName
                    }
                })
            });
            const data = await res.json();

            // Handle debug info if present
            if (data.debug) {
                setDebugInfo(data.debug);
            } else if (data.debugLogs) {
                setDebugInfo({ logs: data.debugLogs, screenshot: null });
            }

            if (!data.success && data.error) {
                if (typeof data.error === 'object') {
                    setError(data.error.message || JSON.stringify(data.error));
                } else {
                    setError(String(data.error));
                }
            } else if (data.data) {
                setResults(data.data);
                // Save sessionId for detail requests
                if (data.sessionId) {
                    setSessionId(data.sessionId);
                    console.log('Session ID saved:', data.sessionId);
                }
            } else {
                // Fallback: If success is true (or undefined) but no data field, maybe the root IS the data?
                // But usually we expect { data: [...] } structure.
                // Let's assume empty if not found, but log it.
                console.log("No data field found:", data);
                setResults([]);
            }
            // Update total records if provided (API sends 'count', frontend uses 'totalRecords')
            if (data.totalRecords !== undefined || data.count !== undefined) {
                setTotalRecords(data.totalRecords || data.count || 0);
            }
        } catch (err: any) {
            setError(err.message || String(err) || "Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    const loadDetail = async (item: any) => {
        setDetailLoading(true);
        setSelectedMark(item);
        setModalDebug(['Init: Loading detail for ' + item.applicationNo]);

        try {
            setModalDebug(p => [...p, 'Fetching /api/patent-search...']);

            // Debug: Check if markName is present
            console.log("Detail Item:", item);
            if (!item.markName) {
                setModalDebug(p => [...p, 'WARNING: markName is missing!']);
            }

            // Client-side timeout (90 seconds) to prevent infinite spinner
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000);

            try {
                const res = await fetch('/api/patent-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'detail',
                        sessionId: sessionId, // Pass saved sessionId
                        params: {
                            id: item.applicationNo,
                            markName: item.markName || item.text
                        }
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                setModalDebug(p => [...p, `Fetch Status: ${res.status}`]);
                const data = await res.json();
                setModalDebug(p => [...p, `Data Success: ${data.success}`]);

                if (data.success) {
                    if (data.data) {
                        setModalDebug(p => [...p, 'Merging data...']);
                        setSelectedMark((prev: any) => {
                            const merged = { ...prev, ...data.data };
                            if (data.data.debugTextScraped) merged.debugTextScraped = data.data.debugTextScraped;
                            return merged;
                        });
                    }
                    if (data.debug) setDebugInfo(data.debug);
                } else {
                    setModalDebug(p => [...p, `API Error: ${data.error}`]);
                    if (data.debug) setDebugInfo(data.debug);
                    if (data.timeout) {
                        // Still show partial data if available from timeout
                        if (data.data) setSelectedMark((prev: any) => ({ ...prev, ...data.data }));
                    }
                }
            } catch (fetchError: any) {
                if (fetchError.name === 'AbortError') {
                    setModalDebug(p => [...p, 'Client Timeout (90s)']);
                    alert("İşlem çok uzun sürdü (90sn). Sunucu yanıt vermiyor.");
                } else {
                    throw fetchError; // Re-throw other fetch errors to the outer catch
                }
            }

        } catch (error) {
            console.error('Detail fetch error:', error);
            setModalDebug(p => [...p, `Catch Error: ${error}`]);
        } finally {
            setDetailLoading(false);
            setModalDebug(p => [...p, 'Finished']);
        }
    };

    const handlePageChange = async (direction: 'next' | 'prev') => {
        if (!sessionId) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/patent-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "navigate_page",
                    params: {
                        sessionId: sessionId,
                        direction: direction
                    }
                })
            });
            const data = await res.json();

            if (data.success && data.data) {
                setResults(data.data);
                // Update current page
                setCurrentPage(prev => direction === 'next' ? prev + 1 : prev - 1);
                // Update total just in case
                if (data.totalRecords !== undefined || data.count !== undefined) {
                    setTotalRecords(data.totalRecords || data.count || 0);
                }
            } else {
                setError(data.error || "Sayfa değiştirilemedi.");
            }
        } catch (err: any) {
            setError(err.message || "Sayfa değişim hatası");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Marka Araştırma</h1>
            </div>

            {/* Search Form */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
                <form onSubmit={handleSearch} className="space-y-6">
                    <div className="flex w-full gap-4 items-end justify-start">
                        <div className="w-80 space-y-2">
                            <label className="text-sm font-medium">Marka Adı</label>
                            <input
                                type="text"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Marka ismi giriniz..."
                                value={searchParams.searchText}
                                onChange={(e) => setSearchParams({ ...searchParams, searchText: e.target.value })}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex h-10 w-auto min-w-[120px] items-center justify-center rounded-md bg-[#1e3a8a] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#172554] disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Sorgula
                        </button>
                    </div>

                    {/* Class Selection Grid */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Başvurulan Sınıflar</label>
                            {selectedClasses.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedClasses([])}
                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                    Temizle ({selectedClasses.length})
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-9 gap-1 sm:grid-cols-12 md:grid-cols-15 lg:grid-cols-[repeat(45,minmax(0,1fr))]">
                            {Array.from({ length: 45 }, (_, i) => i + 1).map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => toggleClass(num)}
                                    className={`
                                        flex h-8 w-full items-center justify-center rounded border text-xs font-medium transition-colors
                                        ${selectedClasses.includes(num)
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                        }
                                    `}
                                >
                                    {num.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>
                    </div>
                </form>
            </div>


            {/* Loading Animation */}
            {loading && (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white shadow-xl border border-blue-100 animate-in fade-in zoom-in duration-300">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                            <Loader2 className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900">Lütfen bekleyiniz..</h3>
                            <p className="text-sm text-gray-500 mt-1">Türk Patent sayfasından arama yapılıyor...</p>
                            {showLongWaitMessage && (
                                <p className="text-sm text-blue-600 font-medium mt-2 animate-pulse">
                                    Çok fazla kayıt var, veriler çekilmeye devam ediliyor..
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200 space-y-2">
                    <p className="font-bold text-red-600">⚠️ Hata: {error}</p>
                    {/* Show technical error if available */}
                    {(error.includes('DNS') || error.includes('bağlantı')) && (
                        <div className="text-sm text-red-700 mt-2 p-3 bg-red-100 rounded border-l-4 border-red-500">
                            <p className="font-semibold mb-1">💡 Çözüm Önerileri:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>İnternet bağlantınızı kontrol edin</li>
                                <li>Açık olan Chrome tarayıcı pencerelerini kapatın</li>
                                <li>Geliştirme sunucusunu yeniden başlatın (Ctrl+C sonra <code className="bg-red-200 px-1 rounded">npm run dev</code>)</li>
                                <li>Eski browser sessionlarını temizlemek için <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('/api/patent-search');
                                            const data = await res.json();
                                            alert(data.message || 'Temizlendi!');
                                            setError(null);
                                        } catch (e) {
                                            alert('Temizleme başarısız');
                                        }
                                    }}
                                    className="underline text-red-800 font-semibold hover:text-red-900"
                                >buraya tıklayın</button></li>
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* No Results Warning */}
            {hasSearched && !loading && !error && results.length === 0 && (
                <div className="rounded-md bg-orange-50 p-4 border border-orange-200 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <p className="font-bold text-orange-800">Sonuç Bulunamadı</p>
                    </div>
                    <p className="text-sm text-orange-700 mt-1 pl-7">
                        Aradığınız kriterlere uygun marka kaydı bulunmamaktadır.
                    </p>
                </div>
            )}


            {/* Results Table */}
            {filteredResults.length > 0 ? (
                <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Arama Sonuçları</span>
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                            Toplam {totalRecords} kayıt bulundu
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-[#0f172a] text-white border-b">
                                <tr>
                                    <th className="px-4 py-3 w-12">#</th>
                                    <th className="px-4 py-3">Başvuru Numarası</th>
                                    <th className="px-4 py-3">Marka Adı</th>
                                    <th className="px-4 py-3">Marka Sahibi</th>
                                    <th className="px-4 py-3">Başvuru Tarihi</th>
                                    <th className="px-4 py-3">Tescil No</th>
                                    <th className="px-4 py-3">Durumu</th>
                                    <th className="px-4 py-3">Nice Sınıfları</th>
                                    <th className="px-4 py-3">Şekil</th>
                                    <th className="px-4 py-3 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredResults.map((item, idx) => (
                                    <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4 text-center font-medium text-gray-500">{idx + 1}</td>
                                        <td className="px-4 py-4 font-medium">{item.applicationNo}</td>
                                        <td className="px-4 py-4 font-bold text-gray-900">{item.markName}</td>
                                        <td className="px-4 py-4 text-gray-600 font-medium">{item.holderName}</td>
                                        <td className="px-4 py-4">{item.applicationDate}</td>
                                        <td className="px-4 py-4">{item.registrationNo || '-'}</td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                {item.status || 'İşlemde'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-gray-500 text-xs">
                                            {item.niceClasses?.replace ? item.niceClasses.replace(/,/g, ' / ') : item.niceClasses}
                                        </td>
                                        <td className="px-4 py-4">
                                            {item.imagePath ? (
                                                <div
                                                    className="h-12 w-24 relative bg-white border rounded p-1 cursor-zoom-in hover:border-blue-400 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedImage(item.imagePath);
                                                    }}
                                                >
                                                    <img
                                                        src={item.imagePath}
                                                        alt="Logo"
                                                        className="h-full w-full object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button
                                                onClick={() => loadDetail(item)}
                                                className="inline-flex items-center justify-center rounded bg-[#cc0000] px-4 py-2 text-xs font-bold text-white hover:bg-[#a30000] transition-colors shadow-sm"
                                            >
                                                DETAY
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : results.length > 0 ? (
                // Results exist but filtered out by class
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-gray-500 font-medium">Seçilen sınıflarda ({selectedClasses.join(', ')}) sonuç bulunamadı.</p>
                    <button
                        onClick={() => setSelectedClasses([])}
                        className="mt-2 text-blue-600 underline text-sm hover:text-blue-800"
                    >
                        Filtreyi Temizle
                    </button>
                </div>
            ) : null}



            {/* Detail Modal / Overlay */}
            {selectedMark && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-semibold">Marka Detayı</h3>
                            <button onClick={() => setSelectedMark(null)} className="text-muted-foreground hover:text-foreground">
                                Kapat
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    <p className="text-sm text-muted-foreground">TurkPatent'ten detaylar alınıyor...</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDetailLoading(false);
                                            setModalDebug(p => [...p, 'Cancelled by user']);
                                        }}
                                        className="inline-flex items-center justify-center rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                                    >
                                        İşlemi İptal Et
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-start gap-6">
                                        <div className="h-32 w-32 shrink-0 rounded-lg border bg-white p-2">
                                            {selectedMark.imagePath && (
                                                <img src={selectedMark.imagePath} className="h-full w-full object-contain" alt="Logo" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-bold text-blue-900">{selectedMark.markName}</h4>
                                            <p className="text-muted-foreground mt-1">{selectedMark.applicationNo}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">

                                        <div className="p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Başvuru Numarası</div>
                                            <div className="font-medium">{selectedMark.applicationNo}</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Başvuru Tarihi</div>
                                            <div className="font-medium">{selectedMark.applicationDate}</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Tescil Numarası</div>
                                            <div className="font-medium">{selectedMark.registrationNo || '-'}</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Tescil Tarihi</div>
                                            <div className="font-medium">{selectedMark.registrationDate || '-'}</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Bülten No / Tarih</div>
                                            <div className="font-medium">
                                                {selectedMark.bulletinNo ? `${selectedMark.bulletinNo}` : '-'} / {selectedMark.bulletinDate || '-'}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Koruma Tarihi</div>
                                            <div className="font-medium">{selectedMark.protectionDate || '-'}</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Marka Türü</div>
                                            <div className="font-medium">{selectedMark.type || '-'}</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Nice Sınıfları</div>
                                            <div className="font-medium">{selectedMark.niceClasses || '-'}</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Durumu</div>
                                            <div className="font-medium text-blue-600">{selectedMark.status}</div>
                                        </div>

                                        {/* Full Width Items for People/Companies */}
                                        <div className="md:col-span-2 lg:col-span-3 p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Başvuru Sahibi</div>
                                            <div className="font-medium">{selectedMark.ownerName || selectedMark.holderName || '-'}</div>
                                        </div>
                                        <div className="md:col-span-2 lg:col-span-3 p-3 bg-gray-50 rounded border">
                                            <div className="font-bold text-gray-500 text-xs uppercase mb-1">Vekil Bilgileri</div>
                                            <div className="font-medium whitespace-pre-line">{selectedMark.attorneyName || '-'}</div>
                                        </div>
                                    </div>

                                    {/* Decision Info */}
                                    {(selectedMark.decision || selectedMark.decisionReason) && (
                                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                                            <h5 className="font-bold text-blue-900 mb-2">Karar Bilgileri</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-xs text-blue-700 uppercase font-bold">Karar</span>
                                                    <p className="font-medium text-blue-950">{selectedMark.decision || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-blue-700 uppercase font-bold">Gerekçe</span>
                                                    <p className="font-medium text-blue-950">{selectedMark.decisionReason || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Goods and Services */}
                                    {selectedMark.goodsAndServices && selectedMark.goodsAndServices.length > 0 && (
                                        <div className="rounded-lg border overflow-hidden">
                                            <div className="bg-gray-100 px-4 py-2 border-b font-bold text-sm">Mal ve Hizmet Bilgileri</div>
                                            <div className="divide-y">
                                                {selectedMark.goodsAndServices.map((gs: any, i: number) => (
                                                    <div key={i} className="p-3 text-sm flex gap-3">
                                                        <span className="font-bold text-gray-700 shrink-0 w-8">{gs.code}</span>
                                                        <span className="text-gray-600">{gs.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* History Table */}
                                    {selectedMark.history && selectedMark.history.length > 0 && (
                                        <div className="rounded-lg border overflow-hidden">
                                            <div className="bg-gray-100 px-4 py-2 border-b font-bold text-sm">Başvuru İşlem Bilgileri</div>
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-2">Tarih</th>
                                                        <th className="px-4 py-2">İşlem</th>
                                                        <th className="px-4 py-2">Açıklama</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {selectedMark.history.map((h: any, i: number) => (
                                                        <tr key={i}>
                                                            <td className="px-4 py-2 whitespace-nowrap">{h.date}</td>
                                                            <td className="px-4 py-2 font-medium">{h.type}</td>
                                                            <td className="px-4 py-2 text-gray-600">{h.description}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}


                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Image Zoom Modal */}
            {expandedImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
                    onClick={() => setExpandedImage(null)}
                >
                    <div className="relative flex items-center justify-center pointer-events-none">
                        <img
                            src={expandedImage}
                            alt="Zoomed Logo"
                            className="max-h-[85vh] max-w-[85vw] w-auto h-auto min-w-[300px] object-contain rounded-xl shadow-2xl bg-white p-2 pointer-events-auto"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
