import { useState, useEffect } from 'react';
import { LucideX, LucideFileText, LucideSend, LucideDownload, LucideRefreshCcw, LucideMail } from 'lucide-react';
import { ContractData, generateContractPDF } from '@/lib/contract-pdf';
import { toast } from 'sonner';
import { sendContractEmail } from '@/actions/mail';

interface ContractModalProps {
    onClose: () => void;
    firm: any;
    trademarks: any[];
    action: any; // The selected history action
    agencySettings: any;
}

export default function ContractModal({ onClose, firm, trademarks, action, agencySettings }: ContractModalProps) {
    // 1. Parse Initial Data
    // Find similar marks from action full content if possible
    const [similarMarksOptions, setSimilarMarksOptions] = useState<string[]>([]);

    useEffect(() => {
        if (action?.metadata?.full_content) {
            const content = action.metadata.full_content;
            const newOptions: string[] = [];

            // Extract content from all <li> tags
            // The email contains the pre-formatted string we want: "MarkName - (AppNo) (ClientMark benzer markası)"
            const listRegex = /<li[^>]*>(.*?)<\/li>/gi;
            const matches = [...content.matchAll(listRegex)];

            matches.forEach(m => {
                let text = m[1];
                // Remove HTML tags (like <b>, </b>) to get clean text
                text = text.replace(/<[^>]+>/g, '');
                // Decode basic entities
                text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

                if (text.trim()) {
                    newOptions.push(text.trim());
                }
            });

            // Deduplicate
            setSimilarMarksOptions([...new Set(newOptions)]);
        }
    }, [action]);

    // 2. Form State
    const [formData, setFormData] = useState<ContractData>({
        // Client
        clientType: firm.type,
        clientName: firm.type === 'corporate' ? (firm.corporate_title || firm.name) : (firm.individual_name_surname || firm.name),
        clientAddress: (firm.type === 'corporate' ? firm.corporate_address : firm.individual_address)?.replace(/\n/g, ' ') || '',
        clientTC: firm.individual_tc,
        clientTaxOffice: firm.corporate_tax_office,
        clientTaxNumber: firm.corporate_tax_number,
        clientEmail: firm.email,
        clientPhone: firm.phone,
        clientWeb: firm.web_address || firm.website || '',
        clientBornDate: '', // Manual input

        // Transaction
        transactionType: 'YAYIMA İTİRAZ',
        markName: trademarks.length > 0 ? trademarks[0].name : '',
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

    // Helper to handle mark toggles (Multi-select)
    const handleMarkToggle = (mark: string) => {
        const current = formData.markName ? formData.markName.split(', ').filter(Boolean) : [];
        let updated;
        if (current.includes(mark)) {
            updated = current.filter(m => m !== mark);
        } else {
            updated = [...current, mark];
        }
        handleInputChange('markName', updated.join(', '));
    };

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Mail Preview State
    const [isMailPreviewOpen, setIsMailPreviewOpen] = useState(false);
    const [mailSubject, setMailSubject] = useState('Bülten İtiraz Onay Sözleşmesi Hk.');
    const [isSending, setIsSending] = useState(false);
    const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);

    // Initial PDF Generation
    useEffect(() => {
        updatePdf();
    }, []); // Run once on mount, then on manual update or debounced? Let's use manual "Güncelle" button or effect on data change

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

            // Allow revoke? Browser handles blob url gc usually, but good practice.
            // window.URL.revokeObjectURL(oldUrl); 
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
                    <img src="https://qmotrqehdzebojdowuol.supabase.co/storage/v1/object/public/firm-logos/assets/mail-signature.png" alt="Üstün Patent" style="display: block; margin-top: 10px;" />
                </div>
                `;

                const result = await sendContractEmail(
                    firm.id,
                    mailContent,
                    mailSubject,
                    [{ filename: `Sözleşme - ${formData.clientName}.pdf`, content: base64Content }]
                );

                if (result.success) {
                    toast.success(result.message);
                    onClose();
                    // trigger refresh?
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
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kime</label>
                            <div className="p-2 bg-gray-50 rounded border text-sm">{firm.email}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Konu</label>
                            <div className="p-2 border rounded text-sm">{mailSubject}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">İçerik</label>
                            <div className="p-4 bg-gray-50 border rounded text-sm min-h-[100px] space-y-4 font-sans text-gray-800">
                                <div>Merhabalar,</div>
                                <div>Hazırlanan sözleşmemiz ekte yer almaktadır. Sözleşme onayı akabinde fatura işlemlerine geçilecektir. Bu maile "<b>tümünü yanıtla</b>" ile geri dönüş yapıp onay vermenizi rica ederiz.</div>
                                <div>
                                    Teşekkürler.<br />
                                    Saygılarımla
                                </div>
                                <img src="/images/mail-signature.png" alt="İmza" className="h-auto block mt-2" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ekler</label>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded text-sm text-red-600">
                                <LucideFileText size={16} />
                                <span>Sözleşme - {formData.clientName}.pdf</span>
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
                                    <FormInput label="Doğum Tarihi" value={formData.clientBornDate || ''} onChange={(v) => handleInputChange('clientBornDate', v)} type="date" />
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
                                    {trademarks.length > 0 ? trademarks.map((tm: any) => (
                                        <label key={tm.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={formData.markName.split(', ').includes(tm.name)}
                                                onChange={() => handleMarkToggle(tm.name)}
                                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            />
                                            <span className="text-gray-900 font-medium">{tm.name}</span>
                                            <span className="text-gray-400 text-[10px] ml-auto">{tm.application_no}</span>
                                        </label>
                                    )) : <div className="text-gray-400 text-xs text-center py-2">Kayıtlı marka bulunamadı.</div>}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">Seçilen Markalar: {formData.markName}</div>
                            </div>

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
