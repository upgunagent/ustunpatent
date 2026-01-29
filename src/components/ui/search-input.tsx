'use client';

import { LucideSearch, LucideX } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';

export default function SearchInput({ placeholder = 'Arama yapın...' }: { placeholder?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchTerm) {
                params.set('q', searchTerm);
            } else {
                params.delete('q');
            }

            // Only push if params have changed
            if (params.toString() !== searchParams.toString()) {
                startTransition(() => {
                    router.push(`?${params.toString()}`);
                });
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm, router, searchParams]);

    const clearSearch = () => {
        setSearchTerm('');
    };

    return (
        <div className="relative max-w-sm w-full">
            <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-10 py-2 text-sm focus:border-[#001a4f] focus:outline-none focus:ring-1 focus:ring-[#001a4f]"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <LucideSearch size={18} />
            </div>
            {searchTerm && (
                <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    <LucideX size={16} />
                </button>
            )}
        </div>
    );
}
