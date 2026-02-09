import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number };
}

export interface ContractData {
    // Client Info
    clientType: 'individual' | 'corporate';
    clientName: string;
    clientAddress?: string;
    clientTC?: string;
    clientTaxOffice?: string;
    clientTaxNumber?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientWeb?: string; // Added
    clientBornDate?: string; // For individual (Doğum Tarihi)

    // Transaction Info
    transactionType: string; // Default: "YAYIMA İTİRAZ"
    markName: string; // Selected from firm trademarks
    markType: string;
    goodsServices: string;
    objectionMarks: string; // "İtiraz Edilecek Marka Adı/No" (TextArea/Grid content)
    description: string;
    riskStatus: string;

    // Fees
    feeIncluded: boolean; // Harç Ücreti Dahildir/Değildir
    attorneyFeeIncluded: boolean; // Vekalet Ücreti Dahildir/Değildir
    feeAmount: string; // e.g. "10.500"
    vatRate: number; // e.g. 20
    paymentMethod: string;
    paymentDate: string;

    // Agency Info
    bankAccounts: { bank_name: string; account_name: string | null; iban: string }[];
    consultatName: string;
    consultantTitle?: string;
}

export const generateContractPDF = async (data: ContractData) => {
    const doc = new jsPDF({ compress: true }) as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Font & Logo Loading (Same as brand-comparison-pdf) ---
    let base64Logo = '';

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

        const base64Regular = typeof Buffer !== 'undefined' ? Buffer.from(blobRegular).toString('base64') : toBase64(blobRegular);
        const base64Medium = typeof Buffer !== 'undefined' ? Buffer.from(blobMedium).toString('base64') : toBase64(blobMedium);
        base64Logo = typeof Buffer !== 'undefined' ? Buffer.from(blobLogo).toString('base64') : toBase64(blobLogo);

        doc.addFileToVFS('Roboto-Regular.ttf', base64Regular);
        doc.addFileToVFS('Roboto-Medium.ttf', base64Medium);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');
        doc.setFont('Roboto');

    } catch (e) {
        console.error("Resource loading failed", e);
        doc.setFont('helvetica');
    }

    // Date in Header
    const today = new Date().toLocaleDateString('tr-TR');

    // Header Drawing Function
    const drawHeader = () => {
        doc.setFillColor(0, 26, 79); // #001a4f
        doc.rect(0, 0, pageWidth, 20, 'F');

        if (base64Logo) {
            doc.addImage(base64Logo, 'PNG', 15, 6, 40, 8);
        } else {
            // Fallback text
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.text('ÜSTÜN PATENT', 15, 13);
        }

        // Date in Header
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(today, pageWidth - 30, 13);

        doc.setTextColor(0, 0, 0); // Reset
    };

    // Draw Header on First Page
    drawHeader();


    doc.setTextColor(0, 0, 0);
    let currentY = 30;

    // Helper for Tables
    const drawSectionHeader = (title: string, y: number) => {
        doc.setFillColor(0, 26, 79);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(11);
        doc.text(title, pageWidth / 2, y + 5.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        return y + 8;
    };

    // Helper for safe autoTable execution
    const safeAutoTable = (options: any) => {
        try {
            // @ts-ignore
            autoTable(doc, options);
            // Return finalY if it exists, otherwise currentY
            return (doc as any).lastAutoTable?.finalY || currentY;
        } catch (err) {
            console.error("AutoTable Error:", err);
            return currentY + 10; // Fallback spacing
        }
    };

    // 1. Müvekkil Firma Bilgileri
    currentY = drawSectionHeader("Müvekkil Firma Bilgileri", currentY);

    const clientBody = [
        [
            { content: 'Firma / Şahıs Adı', styles: { fontStyle: 'bold', cellWidth: 35 } },
            { content: data.clientName || '', colSpan: 3 }
        ],
        [
            { content: 'Adres', styles: { fontStyle: 'bold' } },
            { content: (data.clientAddress || '').replace(/\n/g, ' '), colSpan: 3 }
        ],
        [
            { content: 'TC Kimlik No', styles: { fontStyle: 'bold' } },
            { content: data.clientTC || '-' },
            { content: 'Doğum Tarihi', styles: { fontStyle: 'bold' } },
            { content: data.clientBornDate || '-' }
        ],
        [
            { content: 'Telefon', styles: { fontStyle: 'bold' } },
            { content: data.clientPhone || '-' },
            { content: 'E-Posta', styles: { fontStyle: 'bold' } },
            { content: data.clientEmail || '-' }
        ],
        [
            { content: 'Vergi Dairesi', styles: { fontStyle: 'bold' } },
            { content: data.clientTaxOffice || '-' },
            { content: 'Vergi Numarası', styles: { fontStyle: 'bold' } },
            { content: data.clientTaxNumber || '-' }
        ]
    ];

    currentY = safeAutoTable({
        startY: currentY,
        body: clientBody,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: 0 },
        columnStyles: {
            0: { cellWidth: 35, fillColor: [240, 240, 240] },
            2: { cellWidth: 35, fillColor: [240, 240, 240] }
        },
        margin: { left: 14, right: 14 }
    }) + 2;


    // 2. Yapılacak İşlem Bilgileri
    currentY = drawSectionHeader("Yapılacak İşlem Bilgileri", currentY);

    // Prepare formatted text for Objection Marks
    const formattedObjectionMarks = data.objectionMarks
        ? data.objectionMarks.split('\n').filter(l => l.trim()).map(l => `• ${l}`).join('\n')
        : '';

    const transactionBody = [
        [
            { content: 'Yapılacak İşlem', styles: { fontStyle: 'bold', cellWidth: 35, fillColor: [240, 240, 240] } },
            { content: data.transactionType || '' }
        ],
        [
            { content: 'Marka', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: data.markName || '' }
        ],
        [
            { content: 'Marka Tipi', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: data.markType || '' }
        ]
    ];

    // Conditionally add Objection Marks
    if (formattedObjectionMarks) {
        transactionBody.push([
            { content: 'İtiraz Edilecek Marka Adı/No', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
            { content: formattedObjectionMarks }
        ]);
    }

    transactionBody.push(
        [
            { content: 'Mal veya Hizmetler', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
            { content: data.goodsServices || ' ' }
        ],
        [
            { content: 'Açıklama', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
            { content: data.description || ' ' }
        ]
    );

    // Conditionally add Risk Status
    if (data.riskStatus) {
        transactionBody.push([
            { content: 'Risk Durumu', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
            { content: data.riskStatus }
        ]);
    }

    currentY = safeAutoTable({
        startY: currentY,
        body: transactionBody,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: 0, minCellHeight: 6 },
        columnStyles: {
            0: { cellWidth: 35 }
        },
        margin: { left: 14, right: 14 }
    }) + 2;

    // 3. Ücret ve Ödeme Bilgileri
    currentY = drawSectionHeader("Ücret ve Ödeme Bilgileri", currentY);

    // Calculate Total
    const feeStr = data.feeAmount || '0';
    const fee = parseFloat(feeStr.replace(/\./g, '').replace(',', '.')) || 0;
    const vat = data.vatRate || 20;
    const total = fee + (fee * (vat / 100));
    const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';

    const feeBody = [
        [
            { content: 'Harç Ücreti', styles: { fontStyle: 'bold', cellWidth: 35, fillColor: [240, 240, 240] } },
            { content: data.feeIncluded ? 'Dahildir.' : 'Dahil Değildir.' },
            { content: 'Ücret', styles: { fontStyle: 'bold', cellWidth: 35, fillColor: [240, 240, 240] } },
            { content: `${feeStr} TL + KDV (%${vat})` }
        ],
        [
            { content: 'Vekalet Ücreti', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: data.attorneyFeeIncluded ? 'Dahildir.' : 'Dahil Değildir.' },
            { content: 'KDV\'li Toplam Ücret', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: totalStr + ' KDV DAHİL', styles: { fontStyle: 'bold' } }
        ],
        [
            { content: 'Ödeme Şekli', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: data.paymentMethod || '' },
            { content: 'Ödeme Tarihi', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: data.paymentDate || '' }
        ]
    ];

    currentY = safeAutoTable({
        startY: currentY,
        body: feeBody,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: 0 },
        margin: { left: 14, right: 14 }
    }) + 2;

    // 4. Hesap Bilgilerimiz (Loop for banks)
    if (data.bankAccounts && data.bankAccounts.length > 0) {
        currentY = drawSectionHeader("Hesap Bilgilerimiz", currentY);

        data.bankAccounts.forEach((bank, idx) => {
            const bankBody = [
                [
                    { content: 'UNVAN', styles: { fontStyle: 'bold', cellWidth: 35, fillColor: [240, 240, 240] } },
                    { content: bank.account_name || 'ÜSTÜN PATENT MARKA VE FİKRİ HAKLAR EĞİTİM DANIŞMANLIK LTD. ŞTİ.' }
                ],
                [
                    { content: 'BANKA', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                    { content: bank.bank_name || '' }
                ],
                [
                    { content: 'IBAN', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                    { content: bank.iban || '', styles: { fontStyle: 'bold' } }
                ]
            ];

            currentY = safeAutoTable({
                startY: currentY,
                body: bankBody,
                theme: 'grid',
                styles: { font: 'Roboto', fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: 0 },
                margin: { left: 14, right: 14 }
            }) + 2;

            if (idx < data.bankAccounts.length - 1) {
                currentY = drawSectionHeader("Hesap Bilgilerimiz", currentY);
            }
        });
    }

    // 5. Vekil Firma Adına / Tarih / Müvekkil Firma Adına
    const sigHeaders = [
        { content: 'Vekil Firma Adına', styles: { fillColor: [0, 26, 79], textColor: 255, halign: 'center', fontStyle: 'bold' } },
        { content: 'Tarih', styles: { fillColor: [0, 26, 79], textColor: 255, halign: 'center', fontStyle: 'bold' } },
        { content: 'Müvekkil Firma Adına', styles: { fillColor: [0, 26, 79], textColor: 255, halign: 'center', fontStyle: 'bold' } }
    ];

    // Check page space before sigs
    if (currentY > pageHeight - 50) {
        doc.addPage();
        drawHeader();
        currentY = 30;
    }

    const sigBody = [
        [
            { content: `\n\n\n${data.consultatName || ''}\n\n`, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
            { content: today, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
            { content: '', styles: { halign: 'center', valign: 'middle' } }
        ]
    ];

    currentY = safeAutoTable({
        startY: currentY,
        head: [sigHeaders],
        body: sigBody,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 10, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: 0 },
        margin: { left: 14, right: 14 }
    }) + 10;

    // Check if we need a new page for Special Provisions
    if (currentY > pageHeight - 80) {
        doc.addPage();
        drawHeader();
        currentY = 30;
    }

    // 6. ÖZEL HÜKÜMLER
    currentY = drawSectionHeader("ÖZEL HÜKÜMLER", currentY);

    const provisions = [
        "1   Marka Tescil Resmi Süreçler: Türk Patent ve Marka Kurumu tarafından belirtilen resmi süreçler; Başvuru yapıldıktan sonra; Uzman tarafından şekli inceleme, benzerlik araştırması ve markanın bültende yayımlanması için verilen kararın toplam süresi otalama 1-4 aydır. Sonrasında Markalar Bülteninde 2 ay süreyle yayınlanır. Bu süreçte herhangi bir itiraz gelmemesi durumunda, süreç sonundan itibaren ortalama 1 ay içinde tescil kararı tebliğ edilir. Kararının tebliğinden itibaren 2 ay içinde tescil harcının ödenmesi gerekmektedir. Tescil kararı ödemesi ne kadar kısa sürede yapılırsa, belgenin Kurum tarafından iletilmesi o kadar hızlı tamamlanacaktır.",
        "2   Tescile hak kazanan Markaların bildirimi müvekkile iletildikten sonra ödenecek olan \"Tescil Ücreti\" müvekkil firma tarafından ödenir. Bildirim sonrası tescil harcı 2 ay içinde ödenmez ise, zamanında ödenmemesinden dolayı sorumluluk müvekkil firmaya ait olacaktır.",
        "3   Marka başvuru işlemi başvuru ücretleri alındıktan sonra tamamlanacaktır.",
        "4   Kurum tarafından iletilen tebligatlar vekaletnamede belirtilen mail adresine yapılır. Bu şekilde gönderilen bildirimler taraflar arasında kanuna uygun resmi tebligat sayılır. Müvekkil belgeleri posta vb. şekilde gönderilmesini talep ederse bu hizmet bedeli müşteriye ait olmak üzere yerine getirilir.",
        "5   Başvuru öncesi yapılan ön araştırma; yayınlanmamış başvuruları kapsamamaktadır. Yayınlanmamış başvurular sebebiyle markanın reddi halinde ÜSTÜN PATENT sorumlu tutulamaz.",
        "6   Marka başvurusunun uzman tarafından ret edilmesi durumunda, 2. marka başvurusu için vekillik ücreti %50 indirimli olarak talep edilecektir. (bu indirime harçlar dahil değildir.)",
        "7   Marka için uzman tarafından verilen ret veya kısmi ret kararlarına yapılacak olan itirazlar için ekstra ücret talep edilecektir.",
        "8   Tescilli markaların benzerlerinin takibiyle ilgili MARKA İZLEME İŞLEMİ ve hukuki işlemler ekstra ücrete tabidir.  Bu takip işlemi bültende yayınlanmamış başvuruları kapsamamaktadır.",
        "9   İhtilaf halinde İstanbul İcra daireleri ve mahkemeleri özel yetkilidir.",
        "10  Yapılan başvuru veya tescil işlemlerinde devlete ödenen tutarlar nakit olarak ödendiği için, bakiye bırakma veya taksitlendirme durumu söz konusu olmayacaktır.",
        "11  Yurtiçinde yapılan başvuru sonrası Yurtdışında da markanın korunmasının istenmesi durumunda başvuru tarihinden itibaren 6 ay içerisinde rüçhan hakkınızı (öncelik hakkınızı) kullanarak yurt dışı tescil başvurusunda bulunulması gerekmektedir.",
        "12  İş bu sözleşme ile onay verilen işlem gerçekleştirildiği tarihten itibaren müvekkil firma/şahıs adının vekil firmanın referans listesinde yer almasını kabul etmektedir.",
        "13  İş bu sözleşme esnasında müvekkil firma/şahıs tarafından verilen referanslar bilgilendirme, tanıtım, teklif v.b. amaçlar ile aranabilecek, mail, fax, sms v.b. iletişim araçları ile bilgilendirilebilecektir."
    ];

    const provisionsBody = provisions.map(p => {
        // Split by first space to separate number
        const firstSpace = p.indexOf(' ');
        const num = p.substring(0, firstSpace);
        const text = p.substring(firstSpace + 1).trim();
        return [
            { content: num, styles: { fontStyle: 'bold', halign: 'center', valign: 'top' } },
            { content: text, styles: { halign: 'justify' } }
        ]
    });

    currentY = safeAutoTable({
        startY: currentY,
        body: provisionsBody,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: 0 },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data: any) => {
            if (data.pageNumber > 1) {
                drawHeader();
            }
        }
    });


    return doc.output('bloburl');
};
