'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LucideFilter, LucideX } from 'lucide-react';

export default function WatchedMarksFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [year, setYear] = useState(searchParams.get('year') || '');
    const [month, setMonth] = useState(searchParams.get('month') || '');

    // Generate years (2026 to 2040)
    const years = Array.from({ length: 15 }, (_, i) => 2026 + i);

    const months = [
        { value: '1', label: 'Ocak' },
        { value: '2', label: 'Şubat' },
        { value: '3', label: 'Mart' },
        { value: '4', label: 'Nisan' },
        { value: '5', label: 'Mayıs' },
        { value: '6', label: 'Haziran' },
        { value: '7', label: 'Temmuz' },
        { value: '8', label: 'Ağustos' },
        { value: '9', label: 'Eylül' },
        { value: '10', label: 'Ekim' },
        { value: '11', label: 'Kasım' },
        { value: '12', label: 'Aralık' },
    ];

    const handleFilter = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (year) {
            params.set('year', year);
        } else {
            params.delete('year');
        }

        if (month) {
            params.set('month', month);
        } else {
            params.delete('month');
        }

        router.push(`?${params.toString()}`);
    };

    const handleClear = () => {
        setYear('');
        setMonth('');
        router.push('?');
    };

    return (
        <div className="flex items-center gap-2 bg-white p-2 rounded-md border border-gray-200">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 mx-2">İzleme Bitiş Tarihi Seçin:</span>
                <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="h-9 rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                >
                    <option value="">Yıl Seçin</option>
                    {years.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>

                <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="h-9 rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                >
                    <option value="">Ay Seçin</option>
                    {months.map((m) => (
                        <option key={m.value} value={m.value}>
                            {m.label}
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleFilter}
                className="h-9 px-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
                <LucideFilter size={14} />
                Filtrele
            </button>

            {(searchParams.get('year') || searchParams.get('month')) && (
                <button
                    onClick={handleClear}
                    className="h-9 px-3 bg-gray-100 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                    <LucideX size={14} />
                    Temizle
                </button>
            )}
        </div>
    );
}
