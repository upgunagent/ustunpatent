'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, X, FilterX } from 'lucide-react';

interface BulletinFilterProps {
    onFilterChange: (filters: FilterState) => void;
    initialFilters?: FilterState;
}

export interface FilterState {
    bulletinNo: string;
    markName: string;
    classes: string[];
}

export default function BulletinFilter({ onFilterChange, initialFilters }: BulletinFilterProps) {
    const [bulletinNo, setBulletinNo] = useState(initialFilters?.bulletinNo || '');
    const [markName, setMarkName] = useState(initialFilters?.markName || '');
    const [selectedClasses, setSelectedClasses] = useState<string[]>(initialFilters?.classes || []);
    const [isClassesExpanded, setIsClassesExpanded] = useState(false);

    // Sync state with props when URL changes
    useEffect(() => {
        if (initialFilters) {
            setMarkName(initialFilters.markName || '');
            setBulletinNo(initialFilters.bulletinNo || '');
            setSelectedClasses(initialFilters.classes || []);
        }
    }, [initialFilters?.markName, initialFilters?.bulletinNo, initialFilters]);

    // Initial constants
    const bulletinOptions = ['484']; // This can be dynamic later
    const classOptions = Array.from({ length: 45 }, (_, i) => (i + 1).toString().padStart(2, '0'));

    const handleSearch = () => {
        onFilterChange({
            bulletinNo,
            markName,
            classes: selectedClasses
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleClassToggle = (classNo: string) => {
        setSelectedClasses(prev =>
            prev.includes(classNo)
                ? prev.filter(c => c !== classNo)
                : [...prev, classNo]
        );
    };

    const toggleSelectAll = () => {
        if (selectedClasses.length === classOptions.length) {
            setSelectedClasses([]);
        } else {
            setSelectedClasses(classOptions);
        }
    };

    const handleClear = () => {
        setMarkName('');
        setBulletinNo('');
        setSelectedClasses([]);
        onFilterChange({
            bulletinNo: '',
            markName: '',
            classes: []
        });
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                {/* Bulletin No Select */}
                <div className="space-y-1 w-full md:w-1/4">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Bülten No</label>
                    <div className="relative">
                        <select
                            value={bulletinNo}
                            onChange={(e) => setBulletinNo(e.target.value)}
                            className="w-full h-10 pl-3 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                        >
                            <option value="">Tümü</option>
                            {bulletinOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-3 text-gray-400 w-4 h-4 pointer-events-none" />
                    </div>
                </div>

                {/* Mark Name Search */}
                <div className="space-y-1 w-full md:flex-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Marka Adı</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={markName}
                            onChange={(e) => setMarkName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Marka adı ile ara (benzerlik araması yapılır)..."
                            className="w-full h-10 pl-10 pr-4 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex-none flex items-center gap-2">
                    <button
                        onClick={handleClear}
                        className="h-10 px-4 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 flex items-center gap-2"
                        title="Filtreleri Temizle"
                    >
                        <FilterX size={16} />
                        Temizle
                    </button>
                    <button
                        onClick={handleSearch}
                        className="h-10 px-6 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
                    >
                        <Search size={16} />
                        Ara
                    </button>
                </div>
            </div>

            {/* Classes Selection */}
            <div className="space-y-2 border-t pt-4">
                <div
                    className="flex items-center justify-between cursor-pointer group select-none"
                    onClick={() => setIsClassesExpanded(!isClassesExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase cursor-pointer">
                            Başvurulan Sınıflar
                        </label>
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                            {selectedClasses.length > 0 ? `${selectedClasses.length} Seçili` : 'Tümü'}
                        </span>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        {isClassesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {isClassesExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                {selectedClasses.length === classOptions.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                            </button>
                        </div>
                        <div className="grid grid-cols-5 sm:grid-cols-9 md:grid-cols-15 gap-2">
                            {classOptions.map((classNo) => (
                                <div
                                    key={classNo}
                                    onClick={() => handleClassToggle(classNo)}
                                    className={`
                                        flex items-center justify-center p-2 rounded border text-xs cursor-pointer transition-all select-none
                                        ${selectedClasses.includes(classNo)
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'}
                                    `}
                                >
                                    {classNo}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
