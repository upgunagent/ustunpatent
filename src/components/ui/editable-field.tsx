'use client';

import { useState } from 'react';
import { LucidePencil, LucideCheck, LucideX } from 'lucide-react';
import { updateFirm } from '@/actions/firms';

interface EditableFieldProps {
    firmId: string;
    field: string;
    value: string | null | undefined;
    label?: string;
    type?: 'text' | 'email' | 'url' | 'tel';
    multiline?: boolean;
    options?: string[]; // If provided, renders a select
    onUpdate?: () => void;
}

export default function EditableField({
    firmId,
    field,
    value,
    label,
    type = 'text',
    multiline = false,
    options,
    onUpdate
}: EditableFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateFirm(firmId, { [field]: currentValue });
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            alert('Güncellenirken bir hata oluştu');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setCurrentValue(value || '');
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="group">
                {label && (
                    <div className="mb-1">
                        <span className="text-xs text-gray-500 uppercase">{label}</span>
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    {options ? (
                        <select
                            value={currentValue}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-[#001a4f] focus:outline-none focus:ring-1 focus:ring-[#001a4f]"
                            autoFocus
                        >
                            <option value="">Seçiniz</option>
                            {options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : multiline ? (
                        <textarea
                            value={currentValue}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-[#001a4f] focus:outline-none focus:ring-1 focus:ring-[#001a4f]"
                            rows={3}
                            autoFocus
                        />
                    ) : (
                        <input
                            type={type}
                            value={currentValue}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-[#001a4f] focus:outline-none focus:ring-1 focus:ring-[#001a4f]"
                            autoFocus
                        />
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            <LucideCheck size={12} /> Kaydet
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                        >
                            <LucideX size={12} /> İptal
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="group">
            {label && (
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 uppercase">{label}</span>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-gray-400 hover:text-[#001a4f] transition-all"
                        title="Düzenle"
                    >
                        <LucidePencil size={12} />
                    </button>
                </div>
            )}
            <div className="font-medium text-gray-900 leading-normal">
                {value || <span className="text-gray-400 italic text-sm">-</span>}
            </div>
            {!label && (
                <button
                    onClick={() => setIsEditing(true)}
                    className="mt-1 text-xs text-blue-600 hover:underline"
                >
                    Düzenle
                </button>
            )}
        </div>
    );
}
