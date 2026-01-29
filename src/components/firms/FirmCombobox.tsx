
'use client';

import * as React from 'react';
import { LucideCheck, LucideChevronsUpDown, LucideSearch, LucideLoader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming you might have one, or I'll implement simple debounce
import { getFirmsForSelect } from '@/actions/firms';

interface FirmComboboxProps {
    value?: string;
    onChange: (value: string) => void;
}

export function FirmCombobox({ value, onChange }: FirmComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [firms, setFirms] = React.useState<{ id: string; label: string; subLabel?: string }[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [selectedFirm, setSelectedFirm] = React.useState<{ id: string; label: string } | null>(null);

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            fetchFirms(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchFirms = async (query: string) => {
        setLoading(true);
        try {
            const data = await getFirmsForSelect(query);
            setFirms(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    React.useEffect(() => {
        fetchFirms('');
    }, []);

    const handleSelect = (firm: { id: string; label: string }) => {
        setSelectedFirm(firm);
        onChange(firm.id);
        setOpen(false);
    };

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {selectedFirm ? selectedFirm.label : "Firma Seçiniz..."}
                <LucideChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="flex items-center border-b px-3">
                        <LucideSearch className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Firma Adı veya Sahip No ile ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                                <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                Yükleniyor...
                            </div>
                        ) : firms.length === 0 ? (
                            <div className="py-6 text-center text-sm text-gray-500">Firma bulunamadı.</div>
                        ) : (
                            firms.map((firm) => (
                                <div
                                    key={firm.id}
                                    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 ${value === firm.id ? 'bg-gray-100' : ''
                                        }`}
                                    onClick={() => handleSelect(firm)}
                                >
                                    <LucideCheck
                                        className={`mr-2 h-4 w-4 ${value === firm.id ? "opacity-100" : "opacity-0"}`}
                                    />
                                    <div className="flex flex-col">
                                        <span>{firm.label}</span>
                                        {firm.subLabel && (
                                            <span className="text-xs text-gray-500">{firm.subLabel}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
