import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BulletinMark } from '@/components/bulletins/BulletinTable';

// Define font type for jsPDF
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number };
}

interface WatchedTrademark {
    name: string;
    logo_url?: string;
    classes?: string;
    application_no?: string;
    registration_date?: string;
}

export const generateBrandComparisonPDF = async (watchedMark: WatchedTrademark, similarMark: BulletinMark) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Font & Logo Handling ---
    try {
        const fontUrlRegular = window.location.origin + '/fonts/Roboto-Regular.ttf';
        const fontUrlMedium = window.location.origin + '/fonts/Roboto-Medium.ttf';
        const logoUrl = window.location.origin + '/images/ustun-logo-white.png';

        const [blobRegular, blobMedium, blobLogo] = await Promise.all([
            fetch(fontUrlRegular).then(res => {
                if (!res.ok) throw new Error('Failed to load font: ' + fontUrlRegular);
                return res.arrayBuffer();
            }),
            fetch(fontUrlMedium).then(res => {
                if (!res.ok) throw new Error('Failed to load font: ' + fontUrlMedium);
                return res.arrayBuffer();
            }),
            fetch(logoUrl).then(res => {
                if (!res.ok) throw new Error('Failed to load logo: ' + logoUrl);
                return res.arrayBuffer();
            })
        ]);

        const toBase64 = (buffer: ArrayBuffer) => {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        };

        const base64Regular = typeof Buffer !== 'undefined' ? Buffer.from(blobRegular).toString('base64') : toBase64(blobRegular);
        const base64Medium = typeof Buffer !== 'undefined' ? Buffer.from(blobMedium).toString('base64') : toBase64(blobMedium);
        const base64Logo = typeof Buffer !== 'undefined' ? Buffer.from(blobLogo).toString('base64') : toBase64(blobLogo);

        doc.addFileToVFS('Roboto-Regular.ttf', base64Regular);
        doc.addFileToVFS('Roboto-Medium.ttf', base64Medium);

        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');

        doc.setFont('Roboto');

        // --- Header ---
        doc.setFillColor(0, 26, 79); // #001a4f Blue Color
        doc.rect(0, 0, pageWidth, 20, 'F');

        // Logo Image
        // Approx 40x8 mm for logo
        doc.addImage(base64Logo, 'PNG', 15, 6, 40, 8);

    } catch (e) {
        console.error("Resource loading failed", e);
        doc.setFont('helvetica');

        // Fallback Header
        doc.setFillColor(0, 26, 79);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('ÜSTÜN PATENT', 15, 13);
    }

    // Date (Outside try/catch to ensure it prints even if font fails, but font might be helvetica)
    const today = new Date().toLocaleDateString('tr-TR');
    doc.setTextColor(255, 255, 255); // Ensure white for date
    doc.setFontSize(10);
    doc.text(today, pageWidth - 30, 13);

    // --- Title ---
    doc.setTextColor(0, 0, 0); // Reset to black
    doc.setFontSize(16);
    doc.text('Marka İzleme Detayı', pageWidth / 2, 35, { align: 'center' });

    // --- Comparison Table ---
    const startY = 45;

    // Helper to load image
    const getImageData = async (url: string): Promise<string | null> => {
        if (!url) return null;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error('Image load error', e);
            return null;
        }
    };

    const watchedLogo = await getImageData(watchedMark.logo_url || '');
    const similarLogo = await getImageData(similarMark.logo_url || '');

    // Format dates
    const safeDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR');
    };

    let objectionDate = '-';
    if (similarMark.application_date_220) {
        const dParts = similarMark.application_date_220.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (dParts) {
            const d = new Date(`${dParts[3]}-${dParts[2]}-${dParts[1]}`);
            d.setDate(d.getDate() + 75);
            objectionDate = d.toLocaleDateString('tr-TR');
        }
    }

    // Column 1 Content
    const col1Title = `İzlenen Marka\n${watchedMark.name}`;
    const col1Data = [
        { content: '', styles: { minCellHeight: 40, halign: 'center', valign: 'middle' } as any },
        `İzlenen Sınıf: ${watchedMark.classes || '-'}`,
        `Başvuru Tarihi: -`,
        `Başvuru No: ${watchedMark.application_no || '-'}`,
        `Tescil Tarihi: ${safeDate(watchedMark.registration_date || '')}`,
        `Tescil No: ${watchedMark.application_no || '-'}`
    ];

    // Column 2 Content
    const col2Title = `Benzer Marka\n${similarMark.mark_text_540}`;
    const similarClasses = similarMark.nice_classes_511 ? similarMark.nice_classes_511.match(/\d{2}/g)?.join(' ') : '-';

    const col2Data = [
        { content: '', styles: { minCellHeight: 40, halign: 'center', valign: 'middle' } as any },
        `Başvurulan Sınıflar: ${similarClasses}`,
        `Başvuru Tarihi: ${similarMark.application_date_220 || '-'}`,
        `Başvuru Numarası: ${similarMark.application_no_210 || '-'}`,
        `Son İtiraz Tarihi: ${objectionDate}`,
        `Hak Sahibi: ${similarMark.owner_agent_731 || '-'}`
    ];

    // @ts-ignore
    autoTable(doc, {
        startY: startY,
        head: [[
            { content: col1Title, styles: { halign: 'center', valign: 'middle', fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' } },
            { content: col2Title, styles: { halign: 'center', valign: 'middle', fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' } }
        ]],
        body: [
            [col1Data[0], col2Data[0]],
            [col1Data[1], col2Data[1]],
            [col1Data[2], col2Data[2]],
            [col1Data[3], col2Data[3]],
            [col1Data[4], col2Data[4]],
            [col1Data[5], col2Data[5]],
        ],
        theme: 'grid',
        styles: {
            font: 'Roboto',
            fontSize: 10,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            textColor: 0,
            overflow: 'linebreak'
        },
        headStyles: {
            font: 'Roboto',
            fontStyle: 'bold',
            minCellHeight: 20
        },
        columnStyles: {
            0: { cellWidth: pageWidth / 2 - 15 },
            1: { cellWidth: pageWidth / 2 - 15 }
        },
        margin: { left: 15, right: 15 },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.row.index === 0) {
                const cell = data.cell;
                const padding = 2;
                const availableWidth = cell.width - (padding * 2);
                const availableHeight = cell.height - (padding * 2);

                const drawCenteredImage = (imgData: string) => {
                    try {
                        const imgProps = doc.getImageProperties(imgData);
                        const imgRatio = imgProps.width / imgProps.height;

                        let newWidth = availableWidth;
                        let newHeight = newWidth / imgRatio;

                        if (newHeight > availableHeight) {
                            newHeight = availableHeight;
                            newWidth = newHeight * imgRatio;
                        }

                        const x = cell.x + (cell.width - newWidth) / 2;
                        const y = cell.y + (cell.height - newHeight) / 2;

                        doc.addImage(imgData, 'JPEG', x, y, newWidth, newHeight, '', 'FAST');
                    } catch (err) {
                        console.error("Error drawing image", err);
                    }
                };

                if (data.column.index === 0 && watchedLogo) {
                    drawCenteredImage(watchedLogo);
                }
                if (data.column.index === 1 && similarLogo) {
                    drawCenteredImage(similarLogo);
                }
            }
        }
    });

    // Bottom Text
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(10);
    doc.text('İlgili marka karşılaştırması yapılmış ve benzer marka bulunmuştur.', pageWidth / 2, finalY, { align: 'center' });

    // Output as Blob URL instead of save
    return doc.output('bloburl');
};
