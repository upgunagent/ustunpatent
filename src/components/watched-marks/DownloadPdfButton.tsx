'use client';

import { useState } from 'react';
import { LucideDownload, LucideLoader2 } from 'lucide-react';
import { WatchedTrademark } from '@/actions/watched-marks';
import { generateWatchedMarksPDF } from '@/lib/watched-marks-pdf'; // Helper function
import { toast } from 'sonner';

interface DownloadPdfButtonProps {
    marks: WatchedTrademark[];
}

export default function DownloadPdfButton({ marks }: DownloadPdfButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (marks.length === 0) {
            toast.error('İndirilecek veri bulunamadı.');
            return;
        }

        setIsGenerating(true);
        try {
            // Lazy load function if needed, or import directly
            const blobUrl = await generateWatchedMarksPDF(marks);

            if (blobUrl) {
                // Trigger download
                const link = document.createElement('a');
                link.href = blobUrl as unknown as string; // bloburl returns string
                link.download = `izlenen-markalar-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('PDF başarıyla oluşturuldu.');
            } else {
                toast.error('PDF oluşturulamadı.');
            }
        } catch (error) {
            console.error('PDF Generation Error:', error);
            toast.error('PDF oluşturulurken bir hata oluştu.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isGenerating || marks.length === 0}
            className="flex items-center gap-2 bg-[#001a4f] text-white px-4 py-2 rounded-md hover:bg-[#001a4f]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isGenerating ? (
                <LucideLoader2 size={18} className="animate-spin" />
            ) : (
                <LucideDownload size={18} />
            )}
            PDF İndir
        </button>
    );
}
