import React, { useState, KeyboardEvent, useEffect } from 'react';
import { LucideX, LucideUserPlus } from 'lucide-react';

interface Consultant {
    name: string;
    email?: string;
}

interface MultiEmailInputProps {
    value: string[];
    onChange: (emails: string[]) => void;
    consultants?: Consultant[];
    label?: string;
    placeholder?: string;
}

export function MultiEmailInput({ value, onChange, consultants = [], label = "Bilgi (CC)", placeholder = "E-posta girip Enter'a basın veya virgül ile ayırın" }: MultiEmailInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (['Enter', ','].includes(e.key)) {
            e.preventDefault();
            addEmail();
        }
    };

    const addEmail = (emailToAdd?: string) => {
        const rawInput = emailToAdd || inputValue;
        if (!rawInput) return;

        // Split by comma in case user pasted multiple emails
        const emails = rawInput.split(',').map(e => e.trim()).filter(Boolean);

        const newEmails: string[] = [];
        let hasError = false;

        for (const email of emails) {
            if (!isValidEmail(email)) {
                setError(`Geçersiz e-posta: ${email}`);
                hasError = true;
                // Don't modify existing error too much if multiple invalid? 
                // Just show last one or general error.
                continue;
            }

            if (value.includes(email) || newEmails.includes(email)) {
                // already added
                continue;
            }
            newEmails.push(email);
        }

        if (newEmails.length > 0) {
            onChange([...value, ...newEmails]);
            setInputValue(''); // Clear input on success
            setError(null);
        } else if (!hasError && emails.length > 0) {
            // Maybe all were duplicates
            setInputValue('');
            setError('E-posta zaten ekli.');
        }
    };

    const removeEmail = (emailToRemove: string) => {
        onChange(value.filter(email => email !== emailToRemove));
    };

    const handleConsultantSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedEmail = e.target.value;
        if (selectedEmail) {
            // Check if already added
            if (value.includes(selectedEmail)) {
                setError('Bu kişi zaten ekli.');
                setTimeout(() => setError(null), 2000);
            } else {
                onChange([...value, selectedEmail]);
                setError(null);
            }
            e.target.value = ""; // Reset select
        }
    };

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                {label && <label className="block text-xs font-semibold text-gray-500 uppercase">{label}</label>}
                {/* Consultant Quick Select */}
                {consultants.length > 0 && (
                    <div className="flex items-center gap-1">
                        <LucideUserPlus size={12} className="text-gray-400" />
                        <select
                            className="text-[10px] border-none bg-transparent text-blue-600 hover:text-blue-800 focus:ring-0 cursor-pointer py-0 pl-0 pr-6 font-medium"
                            onChange={handleConsultantSelect}
                            defaultValue=""
                        >
                            <option value="" disabled>Hızlı Ekle: Danışman Seç...</option>
                            {consultants.map((c, idx) => (
                                <option key={idx} value={c.email || ''} disabled={!c.email || value.includes(c.email || '')}>
                                    {c.name} {c.email ? `(${c.email})` : '(E-posta yok)'}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className={`flex flex-wrap items-center gap-2 p-2 bg-white border rounded-md focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[42px] ${error ? 'border-red-300' : 'border-gray-300'}`}>
                {value.map((email, index) => (
                    <div key={index} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-100 animate-in fade-in zoom-in-95 duration-200">
                        <span>{email}</span>
                        <button
                            onClick={() => removeEmail(email)}
                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors text-blue-400 hover:text-red-500"
                        >
                            <LucideX size={12} />
                        </button>
                    </div>
                ))}

                <input
                    className="flex-1 outline-none text-sm min-w-[120px] bg-transparent placeholder:text-gray-400"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        if (error) setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => addEmail()}
                    placeholder={value.length === 0 ? placeholder : ""}
                />
            </div>

            {error && <p className="text-xs text-red-500 animate-in slide-in-from-top-1">{error}</p>}
        </div>
    );
}
