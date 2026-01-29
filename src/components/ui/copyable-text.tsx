'use client';

import { useState } from 'react';
import { LucideCheck, LucideCopy } from 'lucide-react';

interface CopyableTextProps {
    text: string;
    children?: React.ReactNode;
    className?: string;
}

export default function CopyableText({ text, children, className = '' }: CopyableTextProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent triggering row clicks if any
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div
            onClick={handleCopy}
            className={`group relative inline-flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1.5 py-0.5 -mx-1.5 transition-colors ${className}`}
            title="Kopyalamak için tıklayın"
        >
            <span className="truncate">{children || text}</span>
            {copied ? (
                <LucideCheck size={12} className="text-green-600 flex-shrink-0" />
            ) : (
                <LucideCopy size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            )}
        </div>
    );
}
