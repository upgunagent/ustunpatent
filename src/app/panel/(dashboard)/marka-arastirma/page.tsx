"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, FileText, Info, AlertTriangle } from "lucide-react";
import { calculateBrandSimilarity, SimilarityResult } from "@/lib/brand-similarity";

// Helper for similarity badge color
const getSimilarityColor = (score: number) => {
    if (score >= 70) return "bg-green-600";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-600";
};

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

    // Detail Modal State - Removed as per request
    // const [selectedMark, setSelectedMark] = useState<any | null>(null);
    // const [detailLoading, setDetailLoading] = useState(false);
    // const [modalDebug, setModalDebug] = useState<string[]>([]);

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

    // Advanced Filtering & Sorting Logic
    const filteredResults = useMemo(() => {
        let processed = [...results];

        // 1. Calculate Similarity & Attach to Object
        if (searchParams.searchText) {
            processed = processed.map(item => {
                const markName = item.markName || "";
                const similarity = calculateBrandSimilarity(searchParams.searchText, markName);
                return { ...item, similarity };
            });
        }

        // 2. Filter by Nice Classes
        if (selectedClasses.length > 0) {
            processed = processed.filter(item => {
                if (!item.niceClasses) return false;
                const itemClasses = item.niceClasses.toString()
                    .split(/[\n,/]+/)
                    .map((c: string) => c.trim().replace(/^0+/, ''))
                    .filter((c: string) => c.length > 0);

                return selectedClasses.some(cls => {
                    const clsStr = cls.toString().replace(/^0+/, '');
                    return itemClasses.includes(clsStr);
                });
            });
        }

        // 3. Sort by Similarity Score (Descending)
        // If scores are equal or non-existent, keep original order
        processed.sort((a, b) => {
            const scoreA = a.similarity?.score || 0;
            const scoreB = b.similarity?.score || 0;
            return scoreB - scoreA;
        });

        return processed;
    }, [results, selectedClasses, searchParams.searchText]);

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
            setHasSearched(true); // Mark as searched

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
                            <p className="text-slate-500">PatentCan, Türk Patent sayfasında arama yapıyor..</p>
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredResults.map((item, idx) => (
                                    <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-4 text-center font-medium text-gray-500">{idx + 1}</td>
                                        <td className="px-4 py-4 font-medium">{item.applicationNo}</td>
                                        <td className="px-4 py-4 font-bold text-gray-900 relative pr-10">
                                            {item.markName}
                                            {item.similarity && item.similarity.score > 0 && (
                                                <div className="absolute right-1 top-1/2 -translate-y-1/2 group/badge">
                                                    <span className={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full ${getSimilarityColor(item.similarity.score)} text-white text-[9px] font-bold shadow-sm z-10 border border-white`}>
                                                        %{item.similarity.score}
                                                    </span>
                                                    {/* Tooltip */}
                                                    <div className="invisible group-hover/badge:visible absolute right-full top-1/2 -translate-y-1/2 mr-2 w-48 bg-gray-900 text-white text-xs rounded p-2 z-50 shadow-xl">
                                                        <div className="font-bold mb-1 border-b border-gray-700 pb-1">{item.similarity.reason}</div>
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] opacity-80">
                                                            <span>Token: {item.similarity.details?.tokenScore}</span>
                                                            <span>Harf: {Math.round(item.similarity.details?.charScore || 0)}</span>
                                                            <span>Fonetik: {Math.round(item.similarity.details?.phoneticScore || 0)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
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
