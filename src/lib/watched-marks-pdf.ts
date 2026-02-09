import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WatchedTrademark } from '@/actions/watched-marks';

// Define font type for jsPDF
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number };
}

export const generateWatchedMarksPDF = async (marks: WatchedTrademark[]) => {
    // Landscape orientation
    const doc = new jsPDF({ orientation: 'landscape', compress: true }) as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Font & Logo Handling ---
    try {
        const fontUrlRegular = window.location.origin + '/fonts/Roboto-Regular.ttf';
        const fontUrlMedium = window.location.origin + '/fonts/Roboto-Medium.ttf';
        const logoUrl = window.location.origin + '/images/ustun-logo-white.png';

        const [blobRegular, blobMedium, blobLogo] = await Promise.all([
            fetch(fontUrlRegular).then(res => res.arrayBuffer()),
            fetch(fontUrlMedium).then(res => res.arrayBuffer()),
            fetch(logoUrl).then(res => res.arrayBuffer())
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

        const base64Regular = toBase64(blobRegular);
        const base64Medium = toBase64(blobMedium);
        const base64Logo = toBase64(blobLogo);

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

    // Page Title (Left in header, next to logo?? Or below?)
    // User request: "solda menü sağda günün tarihi olacak şekilde" -> "solda menü" probably means the title "İzlenen Markalar" or similar context.
    // Let's put "İZLENEN MARKALAR LİSTESİ" next to logo or just "İZLENEN MARKALAR"
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.text('İZLENEN MARKALAR LİSTESİ', 70, 13); // Adjust X position

    // Date (Right aligned in header)
    const today = new Date().toLocaleDateString('tr-TR');
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.text(today, pageWidth - 15, 13, { align: 'right' });

    // --- Table Content ---
    doc.setTextColor(0, 0, 0); // Reset to black

    const tableColumn = [
        "Hak Sahibi",
        "Marka Adı",
        "İzlenen Kelimeler",
        "Başvuru No",
        "Tescil Tarihi",
        "İzlenen Sınıflar",
        "Başlangıç Bülten No",
        "İzleme Başlangıç",
        "İzleme Bitiş",
        "Son İzlenen Bülten",
        "İzlemeyi Yapan"
    ];

    const tableRows = marks.map(mark => [
        mark.rights_owner || '-',
        mark.mark_name || '-',
        mark.watched_keywords || '-',
        mark.application_no || '-',
        mark.registration_date ? new Date(mark.registration_date).toLocaleDateString('tr-TR') : '-',
        mark.classes || '-',
        mark.start_bulletin_no || '-',
        mark.watch_start_date ? new Date(mark.watch_start_date).toLocaleDateString('tr-TR') : '-',
        mark.watch_end_date ? new Date(mark.watch_end_date).toLocaleDateString('tr-TR') : '-',
        mark.last_bulletin_no || '-',
        mark.consultant_name || '-'
    ]);

    // @ts-ignore
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        styles: {
            font: 'Roboto',
            fontSize: 8, // Smaller font for many columns
            cellPadding: 2,
            overflow: 'linebreak',
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [0, 26, 79],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 35 }, // Hak Sahibi
            1: { cellWidth: 25 }, // Marka Adı
            2: { cellWidth: 30 }, // İzlenen Kelimeler
            3: { cellWidth: 24 }, // Başvuru No
            4: { cellWidth: 20 }, // Tescil Tarihi
            5: { cellWidth: 15 }, // Sınıflar
            6: { cellWidth: 20 }, // Başlangıç Bülten
            7: { cellWidth: 20 }, // Başlangıç
            8: { cellWidth: 20 }, // Bitiş
            9: { cellWidth: 20 }, // Son Bülten
            10: { cellWidth: 'auto' } // Danışman
        },
        didDrawPage: (data) => {
            // Header is drawn once at start (manually), but for subsequent pages we might need it?
            // autoTable handles header row repetition.
            // If we want the BLUE header on every page, we need to check data.pageNumber
            if (data.pageNumber > 1) {
                // Draw header background again
                doc.setFillColor(0, 26, 79);
                doc.rect(0, 0, pageWidth, 20, 'F');
                // Re-draw logo and title if needed, but usually just page number is enough or simpler header.
                // For now let's keep it simple or minimal on subsequent pages or just rely on autotable header.
            }
        }
    });

    // Output
    return doc.output('bloburl');
};
