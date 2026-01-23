'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import BulletinTable, { BulletinMark } from '@/components/bulletins/BulletinTable';
import PaginationControl from '@/components/bulletins/PaginationControl';
import BulletinFilter, { FilterState } from '@/components/bulletins/BulletinFilter';
import { calculateBrandSimilarity } from '@/lib/brand-similarity';

interface BulletinClientPageProps {
    initialData: BulletinMark[];
    totalCount: number;
    currentPage: number;
    limit: number;
    isSearchMode: boolean; // Arama modu flag'i
    bulletinOptions: string[];
}

export default function BulletinClientPage({ initialData, totalCount, currentPage, limit, isSearchMode, bulletinOptions }: BulletinClientPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Client-side pagination state (sadece arama modunda kullanılır)
    const [clientPage, setClientPage] = useState(1);
    const clientLimit = 50;

    const [filters, setFilters] = useState<FilterState>({
        bulletinNo: '',
        markName: searchParams.get('markName') || '', // URL'den al
        classes: []
    });

    const handleFilterChange = (newFilters: FilterState) => {
        setFilters(newFilters);

        // markName değiştiğinde URL'i güncelle ve server-side fetch tetikle
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (newFilters.markName) {
                params.set('markName', newFilters.markName);
                params.delete('page'); // İlk sayfaya dön
            } else {
                params.delete('markName');
            }
            router.push(`?${params.toString()}`);
        });
    };

    const filteredData = useMemo(() => {
        let processed = [...initialData];

        // 1. Bulletin No Filter
        if (filters.bulletinNo) {
            processed = processed.filter(item => String(item.issue_no).trim() == String(filters.bulletinNo).trim());
        }

        // 3. Classes Filter
        if (filters.classes.length > 0) {
            processed = processed.filter(item => {
                if (!item.nice_classes_511) return false;
                const matches = item.nice_classes_511.match(/\b\d{2}\b/g);
                const itemClasses: string[] = matches ? Array.from(matches) : [];
                return filters.classes.some(cls => itemClasses.includes(cls));
            });
        }

        // 2. Mark Name Filter & Similarity Sorting
        if (filters.markName) {
            processed = processed.map(item => {
                const markName = item.mark_text_540 || '';
                const similarity = calculateBrandSimilarity(filters.markName, markName);
                return { ...item, similarity };
            });

            // Sadece >10% benzerlik olanları göster
            processed = processed.filter(item => (item.similarity?.score || 0) > 10);

            // Benzerlik skoruna göre sırala (yüksekten düşüğe)
            processed.sort((a, b) => {
                const scoreA = a.similarity?.score || 0;
                const scoreB = b.similarity?.score || 0;
                const tokenScoreA = a.similarity?.details?.tokenScore || 0;
                const tokenScoreB = b.similarity?.details?.tokenScore || 0;

                if (scoreA !== scoreB) return scoreB - scoreA;
                if (tokenScoreA !== tokenScoreB) return tokenScoreB - tokenScoreA;
                return (a.mark_text_540?.length || 0) - (b.mark_text_540?.length || 0);
            });
        }

        return processed;
    }, [initialData, filters]);

    // Client-side pagination (sadece arama modunda)
    const paginatedData = useMemo(() => {
        if (!isSearchMode) return filteredData; // Normal mod: server pagination

        const startIndex = (clientPage - 1) * clientLimit;
        const endIndex = startIndex + clientLimit;
        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, clientPage, isSearchMode]);

    const totalPages = isSearchMode
        ? Math.ceil(filteredData.length / clientLimit)
        : Math.ceil(totalCount / limit);

    const displayedPage = isSearchMode ? clientPage : currentPage;

    const handlePageChange = (newPage: number) => {
        if (isSearchMode) {
            setClientPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            startTransition(() => {
                const params = new URLSearchParams(searchParams);
                params.set('page', String(newPage));
                router.push(`?${params.toString()}`);
            });
        }
    };

    return (
        <div className="space-y-6 relative">



            <BulletinFilter
                onFilterChange={handleFilterChange}
                initialFilters={filters}
                bulletinOptions={bulletinOptions}
            />

            <div className="bg-white rounded-lg border border-gray-200 min-h-[400px]">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <span className="text-sm text-gray-500">
                        {isSearchMode
                            ? `Sonuç: ${filteredData.length} (Toplam Taranan: ${initialData.length}) ${filters.markName ? `- Aranan: "${filters.markName}"` : ''}`
                            : `${paginatedData.length} kayıt listeleniyor (Toplam: ${totalCount})`
                        }
                    </span>
                </div>

                {isPending ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white shadow-xl border border-blue-100 animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                                <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                                <Loader2 className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-gray-900">Lütfen bekleyiniz..</h3>
                                <p className="text-sm text-gray-500 mt-1">Veritabanı taranıyor, lütfen bekleyin...</p>
                            </div>
                        </div>
                    </div>
                ) : paginatedData.length > 0 ? (
                    <BulletinTable data={paginatedData} />
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        Aradığınız kriterlere uygun kayıt bulunamadı.
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <PaginationControl
                    currentPage={displayedPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </div>
        </div>
    );
}
