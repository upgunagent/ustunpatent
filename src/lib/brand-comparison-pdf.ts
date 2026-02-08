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
    registration_no?: string;
}

// Define Firm Details Interface
interface FirmDetails {
    type: 'individual' | 'corporate';
    name: string;
    // Corporate fields
    corporate_title?: string;
    corporate_address?: string;
    // Individual fields
    individual_name_surname?: string;
    individual_address?: string;
    // Common
    representative?: string;
}

export const generateBrandComparisonPDF = async (
    watchedMark: WatchedTrademark,
    similarMark: BulletinMark,
    firmDetails?: FirmDetails, // New optional parameter
    consultantInfo?: { name: string; title: string } // New optional parameter
) => {
    const doc = new jsPDF({ compress: true }) as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper to load and optimize image
    const getImageData = async (
        url: string,
        options: {
            maxSize: number;
            format: 'png' | 'jpeg';
            quality?: number;
            transparent?: boolean;
        } = { maxSize: 600, format: 'png' }
    ): Promise<string | null> => {
        if (!url) return null;
        try {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Resize logic
                    const MAX_SIZE = options.maxSize;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    if (ctx) {
                        // Handle background
                        if (!options.transparent || options.format === 'jpeg') {
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, width, height);
                        }

                        ctx.drawImage(img, 0, 0, width, height);

                        const quality = options.quality ?? 0.7; // Default 0.7
                        const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';

                        resolve(canvas.toDataURL(mimeType, quality));
                    } else {
                        resolve(null);
                    }
                };
                img.onerror = (e) => {
                    console.error('Image load error', e);
                    resolve(null);
                }
                img.src = url;
            });
        } catch (e) {
            console.error('Image load error', e);
            return null;
        }
    };

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

    // Date (Right aligned in header)
    const today = new Date().toLocaleDateString('tr-TR');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(today, pageWidth - 30, 13);

    // --- FORMAL LETTER CONTENT ---
    doc.setTextColor(0, 0, 0); // Reset to black

    let currentY = 35; // Start below header (Reduced from 40)

    if (firmDetails) {
        // Firm Name
        const firmName = firmDetails.type === 'corporate'
            ? (firmDetails.corporate_title || firmDetails.name)
            : (firmDetails.individual_name_surname || firmDetails.name);

        doc.setFont('Roboto', 'bold');
        doc.setFontSize(10); // Reduced from 11
        doc.text(firmName.toUpperCase(), 15, currentY);
        currentY += 4; // Reduced from 5

        // Firm Address
        const address = firmDetails.type === 'corporate'
            ? firmDetails.corporate_address
            : firmDetails.individual_address;

        if (address) {
            doc.setFont('Roboto', 'normal');
            doc.setFontSize(9); // Reduced from 11
            const addressLines = doc.splitTextToSize(address.toUpperCase(), 100);
            doc.text(addressLines, 15, currentY);
            currentY += (addressLines.length * 4) + 6; // Reduced spacing
        } else {
            currentY += 6;
        }

        // Salutation
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(9); // Standardize font size for letter body
        doc.text('Sayın Yetkili,', 15, currentY);
        currentY += 6; // Reduced from 10

        // Paragraph 1
        const bulletinNo = similarMark.issue_no || '...';
        const para1 = `Türk Patent ve Marka Kurumu tarafından yayınlanan ${bulletinNo}. Resmi Marka Bülteninde, adınıza kayıtlı markanıza benzer olanların yayınlandığını bildirmek isteriz.`;
        const para1Lines = doc.splitTextToSize(para1, pageWidth - 30);
        doc.text(para1Lines, 15, currentY);
        currentY += (para1Lines.length * 4) + 3; // Reduced spacing

        // Paragraph 2
        const para2 = `Detayları verilen markaların tescil edilmesine karşı itiraz yapmak istemeniz durumunda talimat vermeniz gerekmektedir.`;
        const para2Lines = doc.splitTextToSize(para2, pageWidth - 30);
        doc.text(para2Lines, 15, currentY);
        currentY += (para2Lines.length * 4) + 3;

        // Paragraph 3 - Objection Date Calculation
        const d = new Date();
        d.setDate(d.getDate() + 30);
        const objectionDate = d.toLocaleDateString('tr-TR');

        const fullPara3 = `İtiraz isteminde bulunmak için son başvuru tarihinin ${objectionDate} olduğunu hatırlatır, bu süre içerisinde talep edilmesi halinde itirazın gerçekleştirilebileceğini belirtmek isteriz.`;
        const para3Lines = doc.splitTextToSize(fullPara3, pageWidth - 30);
        doc.text(para3Lines, 15, currentY);
        currentY += (para3Lines.length * 4) + 6;

        // Closing
        doc.text('Saygılarımızla.', 15, currentY);
        currentY += 8; // Reduced from 15

        // Consultant Name & Title
        const consultantName = consultantInfo?.name || (watchedMark as any).consultant_name || firmDetails.representative || 'İlgili Danışman';
        const consultantTitle = consultantInfo?.title || 'Marka Danışmanı';

        doc.setFont('Roboto', 'bold');
        doc.text(consultantName, 15, currentY);
        currentY += 4;
        doc.setFont('Roboto', 'normal');
        doc.text(consultantTitle, 15, currentY);

        currentY += 8; // Reduced space before table
    } else {
        currentY = 40;
    }

    // --- Title (Marka İzleme Detayı) ---
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(12); // Reduced from 14
    doc.text('Marka İzleme Detayı', pageWidth / 2, currentY, { align: 'center' });
    currentY += 6; // Reduced from 10

    // --- Comparison Table ---
    // Start table at currentY

    // Use parallel loading with aggressive optimization
    // Logo: Resize to 400px (enough for header), keep PNG for transparency if needed (but header is blue, check later. Actually header code draws a blue rect and then the logo. 
    // The logo is `ustun-logo-white.png`. It likely has transparency. 
    // If we use JPEG, the background will be white, which looks bad on blue header. 
    // So for header logo, we MUST use PNG with transparency, but RESIZED.
    // NOTE: The previous code was using base64Logo global variable. 
    // We need to change that part too if we want to optimize the header logo!
    // But wait, the previous code loaded `base64Logo` at the top using `fetch`.
    // We should optimize THAT too if possible. 
    // However, `getImageData` is async and relies on `Image` object which needs DOM context (this code runs in browser so it's fine).

    // Let's optimize the TRADEMARK images first here.
    const [watchedLogo, similarLogo] = await Promise.all([
        getImageData(watchedMark.logo_url || '', { maxSize: 350, format: 'jpeg', quality: 0.5 }),
        getImageData(similarMark.logo_url || '', { maxSize: 350, format: 'jpeg', quality: 0.5 })
    ]);

    // Format dates
    const safeDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR');
    };

    // Recalculate objection date for the table row (keep consistency)
    const dObj = new Date();
    dObj.setDate(dObj.getDate() + 30);
    const objectionDateTable = dObj.toLocaleDateString('tr-TR');


    // Column 1 Content
    const col1Title = `İzlenen Marka\n${watchedMark.name}`;
    const col1Data = [
        { content: '', styles: { minCellHeight: 35, halign: 'center', valign: 'middle' } as any }, // Reduced image height
        `İzlenen Sınıf: ${watchedMark.classes || '-'}`,
        `Başvuru Tarihi: -`,
        `Başvuru No: ${watchedMark.application_no || '-'}`,
        `Tescil Tarihi: ${safeDate(watchedMark.registration_date || '')}`,
        `Tescil No: ${watchedMark.registration_no || '-'}`
    ];

    // Column 2 Content
    const col2Title = `Benzer Marka\n${similarMark.mark_text_540}`;
    const similarClasses = similarMark.nice_classes_511 ? similarMark.nice_classes_511.match(/\d{2}/g)?.join(' ') : '-';

    const col2Data = [
        { content: '', styles: { minCellHeight: 35, halign: 'center', valign: 'middle' } as any }, // Reduced image height
        `Başvurulan Sınıflar: ${similarClasses}`,
        `Başvuru Tarihi: ${similarMark.application_date_220 || '-'}`,
        `Başvuru Numarası: ${similarMark.application_no_210 || '-'}`,
        `Son İtiraz Tarihi: ${objectionDateTable}`,
        `Hak Sahibi: ${similarMark.owner_agent_731 || '-'}`
    ];

    // @ts-ignore
    autoTable(doc, {
        startY: currentY,
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
            fontSize: 9, // Reduced from 10
            cellPadding: 2, // Reduced from 3
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            textColor: 0,
            overflow: 'linebreak'
        },
        headStyles: {
            font: 'Roboto',
            fontStyle: 'bold',
            minCellHeight: 15 // Reduced from 20
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

    // Output as Blob URL instead of save
    return doc.output('bloburl');
};
