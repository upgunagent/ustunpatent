import { useState, useEffect, useMemo } from 'react';
import { LucideX, LucideFileText, LucideSend, LucideDownload, LucideRefreshCcw, LucideMail, LucideUsers } from 'lucide-react';
import { ContractData, generateContractPDF } from '@/lib/contract-pdf';
import { toast } from 'sonner';
import { sendContractEmail } from '@/actions/mail';
import { MultiEmailInput } from '@/components/ui/multi-email-input';
import { getTrademarkContacts } from '@/actions/firms';

interface ContractModalProps {
    onClose: () => void;
    firm: any;
    trademarks: any[];
    action: any; // The selected history action
    agencySettings: any;
    firmContacts?: any[]; // Firma yetkili kişileri
}

export default function ContractModal({ onClose, firm, trademarks, action, agencySettings, firmContacts = [] }: ContractModalProps) {
    // 1. Parse Initial Data
    // Find similar marks from action full content if possible
    const [similarMarksOptions, setSimilarMarksOptions] = useState<string[]>([]);

    useEffect(() => {
        if (action?.metadata?.full_content) {
            const content = action.metadata.full_content;
            const newOptions: string[] = [];

            // Extract content from all <li> tags
            const listRegex = /<li[^>]*>(.*?)<\/li>/gi;
            const matches = [...content.matchAll(listRegex)];

            // Collect firm's own trademark names to filter them out
            const firmMarkNames = trademarks.map(t => t.name?.toLowerCase().trim()).filter(Boolean);

            matches.forEach(m => {
                let text = m[1];
                text = text.replace(/<[^>]+>/g, '');
                text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

                if (text.trim()) {
                    // Filter out firm's own trademarks (İzlenen Tüm Markalar section)
                    const textLower = text.trim().toLowerCase();
                    const isFirmMark = firmMarkNames.some(name =>
                        textLower.startsWith(name) || textLower === name
                    );
                    if (!isFirmMark) {
                        newOptions.push(text.trim());
                    }
                }
            });

            setSimilarMarksOptions([...new Set(newOptions)]);
        }
    }, [action, trademarks]);

    // Firma display name
    const firmDisplayName = firm.type === 'corporate'
        ? (firm.corporate_title || firm.name)
        : (firm.individual_name_surname || firm.name);

    // 2. Form State
    const [formData, setFormData] = useState<ContractData>({
        // Client
        clientType: firm.type,
        clientName: '',
        clientAddress: (firm.type === 'corporate' ? firm.corporate_address : firm.individual_address)?.replace(/\n/g, ' ') || '',
        clientTC: '',
        clientTaxOffice: firm.type === 'corporate' ? firm.corporate_tax_office : (firm.individual_tax_office || ''),
        clientTaxNumber: firm.type === 'corporate' ? firm.corporate_tax_number : (firm.individual_tc || ''),
        clientEmail: '',
        clientPhone: '',
        clientWeb: firm.web_address || firm.website || '',
        clientBornDate: '',

        // Transaction
        transactionType: 'YAYIMA İTİRAZ',
        markName: '',
        markType: '',
        goodsServices: '',
        objectionMarks: '', // User will select from options or type
        description: '',
        riskStatus: '',

        // Fees
        feeIncluded: true,
        attorneyFeeIncluded: true,
        feeAmount: '',
        vatRate: 20,
        paymentMethod: '',
        paymentDate: '',

        // Agency
        bankAccounts: agencySettings.bankAccounts || [],
        consultatName: '', // Initially empty, user selects
        consultantTitle: 'Operasyon Destek Uzmanı'
    });

    // === Marka Sahipleri Seçim Sistemi ===
    const [selectedMarkIds, setSelectedMarkIds] = useState<string[]>([]);
    const [trademarkContactsMap, setTrademarkContactsMap] = useState<Record<string, string[]>>({}); // trademark_id -> contact_id[]
    const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]); // contact IDs
    const [isFirmOwnerSelected, setIsFirmOwnerSelected] = useState(false);

    // Helper to format mark name with app no
    const formatMarkName = (name: string, appNo: string | null | undefined) => {
        return appNo ? `${name} (${appNo})` : name;
    };

    // Load trademark contacts when marks are selected
    useEffect(() => {
        const loadTrademarkContacts = async () => {
            const newMap: Record<string, string[]> = {};
            for (const markId of selectedMarkIds) {
                if (!trademarkContactsMap[markId]) {
                    try {
                        const contacts = await getTrademarkContacts(markId);
                        newMap[markId] = contacts.map((c: any) => c.id);
                    } catch {
                        newMap[markId] = [];
                    }
                } else {
                    newMap[markId] = trademarkContactsMap[markId];
                }
            }
            setTrademarkContactsMap(prev => ({ ...prev, ...newMap }));
        };

        if (selectedMarkIds.length > 0) {
            loadTrademarkContacts();
        }
    }, [selectedMarkIds]);

    // Compute available owners from selected marks
    const availableOwners = useMemo(() => {
        const contactIds = new Set<string>();
        let firmNameFound = false;

        for (const markId of selectedMarkIds) {
            const tm = trademarks.find(t => t.id === markId);
            if (!tm) continue;

            // Check if rights_owner contains firm name
            if (tm.rights_owner && firmDisplayName && tm.rights_owner.includes(firmDisplayName)) {
                firmNameFound = true;
            }

            // Add contacts from junction table
            const tmContactIds = trademarkContactsMap[markId] || [];
            tmContactIds.forEach(id => contactIds.add(id));
        }

        const contacts = firmContacts.filter(c => contactIds.has(c.id));

        return { contacts, firmNameFound };
    }, [selectedMarkIds, trademarkContactsMap, firmContacts, trademarks, firmDisplayName]);

    // Auto-fill form fields when owner selection changes
    useEffect(() => {
        const selectedContacts = firmContacts.filter(c => selectedOwnerIds.includes(c.id));

        // Client Name: firma adı + yetkili adları virgülle
        const names: string[] = [];
        if (isFirmOwnerSelected && firmDisplayName) names.push(firmDisplayName);
        selectedContacts.forEach(c => names.push(c.full_name));

        // TC Kimlik No: firma TC (şahıs ise) + kişilerin TC'leri / ile
        const tcs: string[] = [];
        if (isFirmOwnerSelected && firm.type === 'individual' && firm.individual_tc) {
            tcs.push(firm.individual_tc);
        }
        selectedContacts.forEach(c => { if (c.tc_no) tcs.push(c.tc_no); });
        const tcStr = tcs.join(' / ');

        // Doğum Tarihi: firma sahibi (şahıs ise) + kişilerin doğum tarihleri - ile
        const birthDates: string[] = [];
        if (isFirmOwnerSelected && firm.type === 'individual' && firm.individual_born_date) {
            birthDates.push(new Date(firm.individual_born_date).toLocaleDateString('tr-TR'));
        }
        selectedContacts.forEach(c => {
            if (c.birth_date) {
                birthDates.push(new Date(c.birth_date).toLocaleDateString('tr-TR'));
            }
        });
        const birthStr = birthDates.join(' - ');

        // Telefon: tüm telefonlar / ile (firma + kişiler)
        const phones: string[] = [];
        if (isFirmOwnerSelected) {
            const fp = firm.firm_phones || [];
            fp.filter(Boolean).forEach((p: string) => phones.push(p));
            // Fallback to legacy phone
            if (phones.length === 0 && firm.phone) phones.push(firm.phone);
        }
        selectedContacts.forEach(c => {
            if (c.phones && c.phones.length > 0) {
                c.phones.filter(Boolean).forEach((p: string) => phones.push(p));
            }
        });
        const phoneStr = phones.join(' / ');

        // E-posta: tüm emailler , ile (firma + kişiler)
        const emails: string[] = [];
        if (isFirmOwnerSelected) {
            const fe = firm.firm_emails || [];
            fe.filter(Boolean).forEach((e: string) => emails.push(e));
            // Fallback to legacy email
            if (emails.length === 0 && firm.email) emails.push(firm.email);
        }
        selectedContacts.forEach(c => {
            if (c.emails && c.emails.length > 0) {
                c.emails.filter(Boolean).forEach((e: string) => emails.push(e));
            }
        });
        const emailStr = emails.join(', ');

        // Vergi bilgileri: firma sahip seçiliyse firma bilgilerinden
        const taxOffice = isFirmOwnerSelected
            ? (firm.type === 'corporate' ? firm.corporate_tax_office : firm.individual_tax_office) || ''
            : '';
        const taxNumber = isFirmOwnerSelected
            ? (firm.type === 'corporate' ? firm.corporate_tax_number : firm.individual_tc) || ''
            : '';

        setFormData(prev => ({
            ...prev,
            clientName: names.join(', '),
            clientTC: tcStr,
            clientBornDate: birthStr,
            clientPhone: phoneStr,
            clientEmail: emailStr,
            clientTaxOffice: taxOffice,
            clientTaxNumber: taxNumber,
        }));
    }, [selectedOwnerIds, isFirmOwnerSelected, firmContacts, firm, firmDisplayName]);

    // Handle mark toggles (Multi-select) — now also tracks IDs
    const handleMarkToggle = (markId: string, markLabel: string) => {
        const currentLabels = formData.markName ? formData.markName.split(', ').filter(Boolean) : [];
        let updatedLabels: string[];
        let updatedIds: string[];

        if (selectedMarkIds.includes(markId)) {
            updatedIds = selectedMarkIds.filter(id => id !== markId);
            updatedLabels = currentLabels.filter(m => m !== markLabel);
        } else {
            updatedIds = [...selectedMarkIds, markId];
            updatedLabels = [...currentLabels, markLabel];
        }

        setSelectedMarkIds(updatedIds);
        handleInputChange('markName', updatedLabels.join(', '));

        // Clear owner selections if no marks selected
        if (updatedIds.length === 0) {
            setSelectedOwnerIds([]);
            setIsFirmOwnerSelected(false);
        }
    };

    const toggleOwner = (contactId: string) => {
        setSelectedOwnerIds(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Mail Preview State
    const [isMailPreviewOpen, setIsMailPreviewOpen] = useState(false);
    const [mailSubject, setMailSubject] = useState('Bülten İtiraz Onay Sözleşmesi Hk.');
    const [isSending, setIsSending] = useState(false);
    const [emailCC, setEmailCC] = useState<string[]>([]);
    const [mailToEmails, setMailToEmails] = useState<string[]>([]);
    const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);

    // Initial PDF Generation
    useEffect(() => {
        updatePdf();
    }, []); // Run once on mount

    // Debounced PDF update effect
    useEffect(() => {
        const timer = setTimeout(() => {
            updatePdf();
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData]);

    const updatePdf = async () => {
        setIsGenerating(true);
        try {
            const url = await generateContractPDF(formData);
            setPdfUrl(url.toString());
        } catch (e) {
            console.error(e);
            toast.error('PDF oluşturulamadı');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleInputChange = (field: keyof ContractData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleObjectionMarkToggle = (mark: string) => {
        const current = formData.objectionMarks ? formData.objectionMarks.split('\n') : [];
        if (current.includes(mark)) {
            handleInputChange('objectionMarks', current.filter(m => m !== mark).join('\n'));
        } else {
            handleInputChange('objectionMarks', [...current, mark].join('\n'));
        }
    };

    const handleAddToMail = async () => {
        if (pdfUrl) {
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            setGeneratedPdfBlob(blob);
            setEmailCC([]);
            // Collect TO emails from selected owners
            const toEmails: string[] = [];
            if (isFirmOwnerSelected) {
                const fe = firm.firm_emails || [];
                fe.filter(Boolean).forEach((e: string) => {
                    if (!toEmails.includes(e)) toEmails.push(e);
                });
            }
            firmContacts
                .filter(c => selectedOwnerIds.includes(c.id))
                .forEach(c => {
                    if (c.emails && c.emails.length > 0) {
                        c.emails.filter(Boolean).forEach((e: string) => {
                            if (!toEmails.includes(e)) toEmails.push(e);
                        });
                    }
                });
            // Fallback to legacy firm email if nothing selected
            if (toEmails.length === 0 && firm.email) toEmails.push(firm.email);
            setMailToEmails(toEmails);
            setIsMailPreviewOpen(true);
        }
    };

    const handleDownload = () => {
        if (pdfUrl) {
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = `Sözleşme - ${formData.clientName}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleSendMail = async () => {
        if (!generatedPdfBlob) return;
        setIsSending(true);

        try {
            // Convert blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(generatedPdfBlob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                const base64Content = base64data.split(',')[1];

                const mailContent = `
                <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
                    <p>Merhabalar,</p>
                    <br>
                    <p>Hazırlanan sözleşmemiz ekte yer almaktadır. Sözleşme onayı akabinde fatura işlemlerine geçilecektir. Bu maile "<b>tümünü yanıtla</b>" ile geri dönüş yapıp onay vermenizi rica ederiz.</p>
                    <br>
                    <p>Teşekkürler.</p>
                    <p>Saygılarımla</p>
                    <img src="https://qmotrqehdzebojdowuol.supabase.co/storage/v1/object/public/firm-logos/assets/mail-signature.png" alt="Üstün Patent" style="display: block; margin-top: 10px; width: 400px; height: auto;" />
                </div>
                `;

                const result = await sendContractEmail(
                    firm.id,
                    mailContent,
                    mailSubject,
                    [{ filename: `Sözleşme - ${formData.clientName}.pdf`, content: base64Content }],
                    emailCC,
                    mailToEmails
                );

                if (result.success) {
                    toast.success(result.message);
                    onClose();
                    window.location.reload();
                } else {
                    toast.error(result.message);
                }
                setIsSending(false);
            };

        } catch (e) {
            console.error(e);
            toast.error('Mail gönderilemedi.');
            setIsSending(false);
        }
    };

    if (isMailPreviewOpen) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col relative animate-in zoom-in-95">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h3 className="font-semibold text-lg">Mail Gönderimi Önizleme</h3>
                        <button onClick={() => setIsMailPreviewOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                            <LucideX className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <MultiEmailInput
                                value={mailToEmails}
                                onChange={setMailToEmails}
                                label="Kime"
                                placeholder="E-posta ekleyin..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Konu</label>
                            <div className="p-2 border rounded text-sm">{mailSubject}</div>
                        </div>

                        <div className="space-y-1">
                            <MultiEmailInput
                                value={emailCC}
                                onChange={setEmailCC}
                                consultants={agencySettings?.consultants || []}
                            />
                        </div>

                        <div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">İçerik</label>
                                <div className="p-4 bg-gray-50 border rounded text-sm min-h-[100px] space-y-4 font-sans text-gray-800">
                                    <div>Merhabalar,</div>
                                    <div>Hazırlanan sözleşmemiz ekte yer almaktadır. Sözleşme onayı akabinde fatura işlemlerine geçilecektir. Bu maile &quot;<b>tümünü yanıtla</b>&quot; ile geri dönüş yapıp onay vermenizi rica ederiz.</div>
                                    <div>
                                        Teşekkürler.<br />
                                        Saygılarımla
                                    </div>
                                    <img src="https://qmotrqehdzebojdowuol.supabase.co/storage/v1/object/public/firm-logos/assets/mail-signature.png" alt="Üstün Patent" style={{ display: 'block', marginTop: '10px', width: '400px', height: 'auto' }} />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ekler</label>
                                <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded text-sm text-red-600">
                                    <LucideFileText size={16} />
                                    <span>Sözleşme - {formData.clientName}.pdf</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                        <button onClick={() => setIsMailPreviewOpen(false)} className="px-4 py-2 border rounded bg-white hover:bg-gray-50">Geri Dön</button>
                        <button onClick={handleSendMail} disabled={isSending} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                            {isSending ? 'Gönderiliyor...' : <><LucideSend size={16} /> Gönder</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[90vw] h-[90vh] flex flex-col relative animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <LucideFileText className="text-blue-600" />
                        Sözleşme Oluştur
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <LucideX className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Form */}
                    <div className="w-1/3 border-r overflow-y-auto p-6 space-y-8 bg-[#001a4f]">
                        {/* 1. Müvekkil Bilgileri */}
                        <section className="space-y-3">
                            <h4 className="font-bold text-white border-b border-gray-700 pb-1">Müvekkil Firma Bilgileri</h4>
                            <div className="grid gap-3">
                                <FormInput label="Firma / Şahıs Adı" value={formData.clientName} onChange={(v) => handleInputChange('clientName', v)} />
                                <FormInput label="Adres" value={formData.clientAddress || ''} onChange={(v) => handleInputChange('clientAddress', v)} multiline />
                                <div className="grid grid-cols-2 gap-2">
                                    <FormInput label="TC Kimlik No" value={formData.clientTC || ''} onChange={(v) => handleInputChange('clientTC', v)} />
                                    <FormInput label="Doğum Tarihi" value={formData.clientBornDate || ''} onChange={(v) => handleInputChange('clientBornDate', v)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <FormInput label="Telefon" value={formData.clientPhone || ''} onChange={(v) => handleInputChange('clientPhone', v)} />
                                    <FormInput label="E-posta" value={formData.clientEmail || ''} onChange={(v) => handleInputChange('clientEmail', v)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <FormInput label="Vergi Dairesi" value={formData.clientTaxOffice || ''} onChange={(v) => handleInputChange('clientTaxOffice', v)} />
                                    <FormInput label="Vergi No" value={formData.clientTaxNumber || ''} onChange={(v) => handleInputChange('clientTaxNumber', v)} />
                                </div>
                            </div>
                        </section>

                        {/* 2. İşlem Bilgileri */}
                        <section className="space-y-3">
                            <h4 className="font-bold text-white border-b border-gray-700 pb-1">Yapılacak İşlem Bilgileri</h4>
                            <FormInput label="Yapılacak İşlem" value={formData.transactionType} onChange={(v) => handleInputChange('transactionType', v)} />

                            {/* Multi-select for Marks */}
                            <div>
                                <label className="block text-xs font-semibold text-white mb-1">Marka (Çoklu Seçim)</label>
                                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white grid gap-1">
                                    {trademarks.length > 0 ? trademarks.map((tm: any) => {
                                        const label = formatMarkName(tm.name, tm.application_no);
                                        return (
                                            <label key={tm.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMarkIds.includes(tm.id)}
                                                    onChange={() => handleMarkToggle(tm.id, label)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                                />
                                                <span className="text-gray-900 font-medium">{label}</span>
                                            </label>
                                        );
                                    }) : <div className="text-gray-400 text-xs text-center py-2">Kayıtlı marka bulunamadı.</div>}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">Seçilen Markalar: {formData.markName}</div>
                            </div>

                            {/* Marka Sahipleri Seçimi — marka seçildikten sonra görünür */}
                            {selectedMarkIds.length > 0 && (availableOwners.contacts.length > 0 || availableOwners.firmNameFound) && (
                                <div>
                                    <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1">
                                        <LucideUsers size={12} />
                                        Marka Sahipleri (Firma / Şahıs Seçin)
                                        {(selectedOwnerIds.length + (isFirmOwnerSelected ? 1 : 0)) > 0 && (
                                            <span className="text-[10px] bg-blue-400 text-white px-1.5 py-0.5 rounded-full ml-1">
                                                {selectedOwnerIds.length + (isFirmOwnerSelected ? 1 : 0)} seçili
                                            </span>
                                        )}
                                    </label>
                                    <div className="border border-gray-300 rounded-md p-2 bg-white space-y-1">
                                        {/* Firma adı */}
                                        {availableOwners.firmNameFound && (
                                            <>
                                                <label className={`flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded transition-colors ${isFirmOwnerSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isFirmOwnerSelected}
                                                        onChange={() => setIsFirmOwnerSelected(prev => !prev)}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-gray-900 font-medium">{firmDisplayName}</span>
                                                        <span className="ml-1.5 text-[9px] font-semibold uppercase bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded">
                                                            {firm.type === 'corporate' ? 'Tüzel' : 'Firma'}
                                                        </span>
                                                    </div>
                                                </label>
                                                {availableOwners.contacts.length > 0 && <div className="border-t border-gray-200 my-0.5"></div>}
                                            </>
                                        )}
                                        {/* Yetkili kişiler */}
                                        {availableOwners.contacts.map(contact => (
                                            <label
                                                key={contact.id}
                                                className={`flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded transition-colors ${selectedOwnerIds.includes(contact.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOwnerIds.includes(contact.id)}
                                                    onChange={() => toggleOwner(contact.id)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                                />
                                                <div className="flex-1">
                                                    <span className="text-gray-900 font-medium">{contact.full_name}</span>
                                                    {contact.tc_no && <span className="text-gray-400 ml-1 text-[10px]">TC: {contact.tc_no}</span>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <FormInput label="Marka Tipi" value={formData.markType} onChange={(v) => handleInputChange('markType', v)} />

                            <FormInput label="Mal veya Hizmetler" value={formData.goodsServices} onChange={(v) => handleInputChange('goodsServices', v)} multiline />

                            {/* Objection Marks Selection */}
                            <div>
                                <label className="block text-xs font-semibold text-white mb-1">İtiraz Edilecek Marka (Listeden Seç)</label>
                                <div className="space-y-1 mb-2 max-h-[100px] overflow-y-auto border p-2 rounded bg-white">
                                    {similarMarksOptions.length > 0 ? similarMarksOptions.map((opt, idx) => (
                                        <label key={idx} className="flex items-center gap-2 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={formData.objectionMarks.includes(opt)}
                                                onChange={() => handleObjectionMarkToggle(opt)}
                                                className="rounded text-blue-600"
                                            />
                                            {opt}
                                        </label>
                                    )) : <span className="text-gray-400 text-xs">Benzer marka bulunamadı.</span>}
                                </div>
                                <FormInput label="İtiraz Edilecek Marka (Manuel/Düzenle)" value={formData.objectionMarks} onChange={(v) => handleInputChange('objectionMarks', v)} multiline rows={2} />
                            </div>

                            <FormInput label="Açıklama" value={formData.description} onChange={(v) => handleInputChange('description', v)} multiline />
                            <FormInput label="Risk Durumu" value={formData.riskStatus} onChange={(v) => handleInputChange('riskStatus', v)} />
                        </section>

                        {/* 3. Ücret */}
                        <section className="space-y-3">
                            <h4 className="font-bold text-white border-b border-gray-700 pb-1">Ücret ve Ödeme</h4>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={formData.feeIncluded} onChange={e => handleInputChange('feeIncluded', e.target.checked)} className="rounded" /> Harç Dahil</label>
                                <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={formData.attorneyFeeIncluded} onChange={e => handleInputChange('attorneyFeeIncluded', e.target.checked)} className="rounded" /> Vekalet Dahil</label>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <FormInput
                                    label="Ücret (Birim)"
                                    value={formData.feeAmount}
                                    onChange={(v) => {
                                        const raw = v.toString().replace(/\D/g, '');
                                        const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                        handleInputChange('feeAmount', formatted);
                                    }}
                                />
                                <FormInput label="KDV Oranı (%)" value={formData.vatRate} onChange={(v) => handleInputChange('vatRate', Number(v))} type="number" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <FormInput label="Ödeme Şekli" value={formData.paymentMethod} onChange={(v) => handleInputChange('paymentMethod', v)} />
                                <FormInput label="Ödeme Tarihi" value={formData.paymentDate} onChange={(v) => handleInputChange('paymentDate', v)} type="date" />
                            </div>
                        </section>

                        {/* 4. İmza */}
                        <section className="space-y-3">
                            <h4 className="font-bold text-white border-b border-gray-700 pb-1">İmza</h4>
                            <div>
                                <label className="block text-xs font-semibold text-white mb-1">Danışman</label>
                                <select
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900 px-3"
                                    value={formData.consultatName}
                                    onChange={(e) => handleInputChange('consultatName', e.target.value)}
                                >
                                    <option value="">Seçiniz</option>
                                    {agencySettings.consultants.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </section>

                    </div>

                    {/* Right: PDF Preview */}
                    <div className="w-2/3 bg-gray-100 p-8 flex flex-col items-center justify-center relative">
                        {isGenerating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                                <LucideRefreshCcw className="animate-spin text-blue-600" />
                            </div>
                        )}
                        {pdfUrl ? (
                            <iframe src={pdfUrl} className="w-full h-full shadow-lg rounded-lg bg-white" title="Contract Preview" />
                        ) : (
                            <div className="text-gray-400">Önizleme oluşturuluyor...</div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50">Kapat</button>
                    <button onClick={handleDownload} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2">
                        <LucideDownload size={16} /> İndir
                    </button>
                    <button onClick={handleAddToMail} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
                        <LucideMail size={16} /> Maile Ekle
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper Component
interface FormInputProps {
    label: string;
    value: string | number;
    onChange: (value: any) => void;
    multiline?: boolean;
    type?: string;
    rows?: number;
}

function FormInput({ label, value, onChange, multiline = false, type = "text", rows = 3 }: FormInputProps) {
    return (
        <div>
            <label className="block text-xs font-semibold text-white mb-1">{label}</label>
            {multiline ? (
                <textarea
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900 px-3 py-2"
                    rows={rows}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            ) : (
                <input
                    type={type}
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 h-9 bg-white text-gray-900 px-3"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
        </div>
    );
}
