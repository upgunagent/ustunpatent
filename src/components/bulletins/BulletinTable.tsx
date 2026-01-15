"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { SimilarityResult } from "@/lib/brand-similarity";

export interface BulletinMark {
    id: string;
    issue_no: string;
    logo_url: string;
    mark_text_540: string;
    owner_agent_731: string;
    application_no_210: string;
    application_date_220: string;
    created_at: string;
    nice_classes_511: string;
    goods_services_510: string;
    excluded_goods_services: string;
    viyana_sinifi: string;
    similarity?: SimilarityResult;
}

interface BulletinTableProps {
    data: BulletinMark[];
}

// Helper for similarity badge color
const getSimilarityColor = (score: number) => {
    if (score >= 70) return "bg-green-600";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-600";
};

export default function BulletinTable({ data }: BulletinTableProps) {
    const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
    const [copyFeedback, setCopyFeedback] = useState<{ x: number, y: number, show: boolean }>({ x: 0, y: 0, show: false });

    // Helper to clean text
    const cleanText = (text: string, isDate: boolean = false) => {
        if (!text) return "";
        let cleaned = text
            .replace(/türk patent ve marka/gi, "")
            .replace(/\(kurumu\)/gi, "")
            .replace(/resmi marka bülteni/gi, "")
            .replace(/yayın tarihi :/gi, "")
            .trim();

        if (isDate) {
            const dateMatch = cleaned.match(/\d{2}\.\d{2}\.\d{4}/);
            return dateMatch ? dateMatch[0] : "";
        }
        return cleaned;
    };

    // Helper to extract only 2-digit class numbers
    const formatClasses = (text: string) => {
        if (!text) return "";
        const matches = text.match(/\b\d{2}\b/g);
        if (!matches) return "";
        return [...new Set(matches)].join(", ");
    };

    const handleCopy = (text: string, e: React.MouseEvent) => {
        if (!text) return;
        navigator.clipboard.writeText(text);

        setCopyFeedback({ x: e.clientX, y: e.clientY, show: true });

        setTimeout(() => {
            setCopyFeedback(prev => ({ ...prev, show: false }));
        }, 1000);
    };

    return (
        <>
            <div className="overflow-x-auto rounded-md border max-h-[calc(100vh-200px)] relative">
                <table className="min-w-full divide-y divide-gray-200 border-collapse table-fixed">
                    <thead className="bg-white sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th
                                style={{ width: 40, minWidth: 40 }}
                                className="px-0.5 py-1 md:px-1 md:py-2 text-left text-[10px] md:text-[11px] lg:text-xs font-medium text-gray-500 uppercase tracking-tight bg-gray-50 border-r border-gray-200 relative group select-none whitespace-nowrap"
                            >
                                <div className="flex items-center justify-between h-full overflow-hidden">
                                    <span className="block w-full truncate">Bülten No</span>
                                </div>
                            </th>
                            <th
                                style={{ width: 40, minWidth: 40 }}
                                className="px-0.5 py-1 md:px-1 md:py-2 text-left text-[10px] md:text-[11px] lg:text-xs font-medium text-gray-500 uppercase tracking-tight bg-gray-50 border-r border-gray-200 relative group select-none whitespace-nowrap"
                            >
                                <div className="flex items-center justify-between h-full overflow-hidden">
                                    <span className="block w-full truncate">Logo</span>
                                </div>
                            </th>
                            <ResizableTh title="Marka Adı" initialWidth={100} />
                            <ResizableTh title="Marka Sahibi" initialWidth={100} />
                            <ResizableTh title="Başvuru/Dosya No" initialWidth={130} />
                            <ResizableTh title="Başvuru Tarihi" initialWidth={110} />
                            <ResizableTh title="Kayıt Tarihi" initialWidth={110} />
                            <ResizableTh title="Sınıflar" initialWidth={90} />
                            <th
                                className="px-1 py-1 md:px-2 md:py-2 text-left text-[10px] md:text-[11px] lg:text-xs font-medium text-gray-500 uppercase tracking-tight bg-gray-50 border-r border-gray-200 relative group select-none w-auto"
                            >
                                <div className="flex items-center justify-between h-full overflow-hidden">
                                    <span className="block w-full truncate">Sınıf İçerikleri</span>
                                </div>
                            </th>
                            <ResizableTh title="Çıkartılan İçerikler" initialWidth={140} />
                            <ResizableTh title="Viyana Sınıfı" initialWidth={110} />
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((mark, index) => (
                            <tr key={index} className="hover:bg-gray-50 divide-x divide-gray-200 group">
                                <td
                                    className="px-1 py-1 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-900 overflow-hidden text-ellipsis border-gray-200 cursor-pointer active:bg-blue-50"
                                    onClick={(e) => handleCopy(mark.issue_no, e)}
                                >
                                    {String(mark.issue_no).trim()}
                                </td>
                                <td className="px-0.5 py-1 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-500 border-gray-200">
                                    {mark.logo_url ? (
                                        <div
                                            className="relative w-8 h-8 md:w-10 md:h-10 border rounded cursor-pointer overflow-hidden bg-gray-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedLogo(mark.logo_url);
                                            }}
                                        >
                                            <Image
                                                src={mark.logo_url}
                                                alt="Marka Logosu"
                                                fill
                                                className="object-contain"
                                                unoptimized
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-[10px]">Yok</span>
                                    )}
                                </td>
                                <td
                                    className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-900 overflow-hidden text-ellipsis max-w-0 cursor-pointer active:bg-blue-50 relative pr-6 md:pr-8"
                                    title={mark.mark_text_540}
                                    onClick={(e) => handleCopy(cleanText(mark.mark_text_540), e)}
                                >
                                    {cleanText(mark.mark_text_540)}
                                    {mark.similarity && mark.similarity.score > 0 && (
                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 group/badge">
                                            <span className={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full ${getSimilarityColor(mark.similarity.score)} text-white text-[9px] font-bold shadow-sm z-10 border border-white`}>
                                                %{mark.similarity.score}
                                            </span>
                                            {/* Tooltip */}
                                            <div className="invisible group-hover/badge:visible absolute right-full top-1/2 -translate-y-1/2 mr-2 w-48 bg-gray-900 text-white text-xs rounded p-2 z-50 shadow-xl">
                                                <div className="font-bold mb-1 border-b border-gray-700 pb-1">{mark.similarity.reason}</div>
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] opacity-80">
                                                    <span>Token: {mark.similarity.details?.tokenScore}</span>
                                                    <span>Harf: {Math.round(mark.similarity.details?.charScore || 0)}</span>
                                                    <span>Fonetik: {Math.round(mark.similarity.details?.phoneticScore || 0)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td
                                    className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-500 overflow-hidden text-ellipsis max-w-0 cursor-pointer active:bg-blue-50"
                                    title={mark.owner_agent_731}
                                    onClick={(e) => handleCopy(cleanText(mark.owner_agent_731), e)}
                                >
                                    {cleanText(mark.owner_agent_731)}
                                </td>
                                <td
                                    className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-500 border-gray-200 cursor-pointer active:bg-blue-50"
                                    onClick={(e) => handleCopy(mark.application_no_210, e)}
                                >
                                    {mark.application_no_210}
                                </td>
                                <td
                                    className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-500 border-gray-200 cursor-pointer active:bg-blue-50"
                                    onClick={(e) => handleCopy(cleanText(mark.application_date_220, true), e)}
                                >
                                    {cleanText(mark.application_date_220, true)}
                                </td>
                                <td
                                    className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-500 border-gray-200 cursor-pointer active:bg-blue-50"
                                    onClick={(e) => handleCopy(new Date(mark.created_at).toLocaleDateString("tr-TR"), e)}
                                >
                                    {new Date(mark.created_at).toLocaleDateString("tr-TR")}
                                </td>
                                <td
                                    className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-500 overflow-hidden text-ellipsis max-w-0 cursor-pointer active:bg-blue-50"
                                    title={mark.nice_classes_511}
                                    onClick={(e) => handleCopy(formatClasses(mark.nice_classes_511), e)}
                                >
                                    {formatClasses(mark.nice_classes_511)}
                                </td>
                                <td
                                    className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-500 overflow-hidden text-ellipsis max-w-0 cursor-pointer active:bg-blue-50"
                                    title={mark.goods_services_510}
                                    onClick={(e) => handleCopy(mark.goods_services_510, e)}
                                >
                                    {mark.goods_services_510}
                                </td>
                                <td
                                    className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-500 overflow-hidden text-ellipsis max-w-0 cursor-pointer active:bg-blue-50"
                                    title={mark.excluded_goods_services}
                                    onClick={(e) => handleCopy(mark.excluded_goods_services, e)}
                                >
                                    {mark.excluded_goods_services}
                                </td>
                                <td
                                    className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs text-gray-500 overflow-hidden text-ellipsis max-w-0 cursor-pointer active:bg-blue-50"
                                    title={mark.viyana_sinifi}
                                    onClick={(e) => handleCopy(mark.viyana_sinifi, e)}
                                >
                                    {mark.viyana_sinifi}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {copyFeedback.show && (
                <div
                    className="fixed z-50 bg-black/80 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full transition-opacity"
                    style={{ left: copyFeedback.x, top: copyFeedback.y - 10 }}
                >
                    Kopyalandı
                </div>
            )}

            {selectedLogo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setSelectedLogo(null)}
                >
                    <div
                        className="relative bg-white p-2 rounded-lg max-w-2xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-2 right-2 p-1 bg-white rounded-full text-black hover:bg-gray-200"
                            onClick={() => setSelectedLogo(null)}
                        >
                            <X size={24} />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={selectedLogo}
                            alt="Büyük Logo"
                            className="max-w-full max-h-[85vh] object-contain"
                        />
                    </div>
                </div>
            )}
        </>
    );
}

// Resizable Header Component
const ResizableTh = ({ title, initialWidth }: { title: string; initialWidth: number }) => {
    const [width, setWidth] = useState(initialWidth);

    useEffect(() => {
        setWidth(initialWidth);
    }, [initialWidth]);

    const resizingRef = useRef(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = true;
        startXRef.current = e.pageX;
        startWidthRef.current = width;

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "col-resize";
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!resizingRef.current) return;
        const diff = e.pageX - startXRef.current;
        const newWidth = Math.max(30, startWidthRef.current + diff);
        requestAnimationFrame(() => {
            setWidth(newWidth);
        });
    };

    const onMouseUp = () => {
        resizingRef.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
    };

    return (
        <th
            style={{ width: width, minWidth: width }}
            className="px-1 py-1 md:px-2 md:py-2 text-left text-[10px] md:text-[11px] lg:text-xs font-medium text-gray-500 uppercase tracking-tight bg-gray-50 border-r border-gray-200 relative group select-none whitespace-nowrap"
        >
            <div className="flex items-center justify-between h-full overflow-hidden">
                <span className="block w-full truncate">{title}</span>
            </div>
            <div
                onMouseDown={onMouseDown}
                className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize z-30 flex justify-end group/resizer"
            >
                <div className="w-1 h-full bg-transparent group-hover/resizer:bg-blue-400 transition-colors" />
            </div>
        </th>
    );
};
