'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { LucideUser } from 'lucide-react';

interface ConsultantFilterProps {
    consultants: { id: string; name: string }[];
}

export default function ConsultantFilter({ consultants }: ConsultantFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentRepresentative = searchParams.get('representative') || '';

    const handleFilterChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('representative', value);
        } else {
            params.delete('representative');
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="relative w-full md:w-64">
            <select
                value={currentRepresentative}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white pl-10 pr-8 py-2 text-sm focus:border-[#001a4f] focus:outline-none focus:ring-1 focus:ring-[#001a4f]"
            >
                <option value="">Tüm Temsilciler</option>
                {consultants?.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                ))}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <LucideUser size={18} />
            </div>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
            </div>
        </div>
    );
}
