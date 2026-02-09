import { useState, useEffect, useRef, useCallback } from 'react';
import { LucideX, LucideFileText, LucideSend, LucideDownload, LucideRefreshCcw, LucideMail, LucideCheck } from 'lucide-react';
import { ContractData, generateContractPDF } from '@/lib/contract-pdf';
import { toast } from 'sonner';
import { sendContractEmail } from '@/actions/mail';
import { getFirmTrademarks } from '@/actions/firms';
import { MultiEmailInput } from '@/components/ui/multi-email-input';
import { WatchedTrademark } from '@/actions/watched-marks';

interface RenewContractModalProps {
    onClose: () => void;
    trademark: WatchedTrademark;
    firmEmail: string | null;
    firmId: string;
    agencySettings: any;
}

export default function RenewContractModal({ onClose, trademark, firmEmail, firmId, agencySettings }: RenewContractModalProps) {
    // 1. Initial Data Preparation
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 15);
    const validUntilDate = futureDate.toLocaleDateString('tr-TR');

    // Firm Info from Trademark Data
    const firm = trademark.firm_info;

    // 2. Form State
    const [formData, setFormData] = useState<ContractData>({
        // Client - Auto-fill from firm info
        clientType: (firm?.type as 'individual' | 'corporate') || 'corporate',
        clientName: firm?.corporate_title || firm?.individual_name_surname || trademark.rights_owner || '',
        clientAddress: firm?.address || '',
        clientTC: firm?.tc_no || '',
        clientTaxOffice: firm?.tax_office || '',
        clientTaxNumber: firm?.tax_number || '',
        clientEmail: firm?.email || firmEmail || '',
        clientPhone: firm?.phone || '',
        clientWeb: firm?.website || '',
        clientBornDate: firm?.born_date || '',

        // Transaction
        transactionType: 'MARKA İZLEME YENİLEME',
        markName: trademark.mark_name || '',
        markType: '',
        goodsServices: '',
        objectionMarks: '',
        description: 'Marka izleme süresinin 1 yıl uzatılması işlemi', // Updated text
        riskStatus: '',

        // Fees
        feeIncluded: true,
        attorneyFeeIncluded: true,
        feeAmount: '',
        vatRate: 20,
        paymentMethod: 'Havale/EFT',
        paymentDate: today.toISOString().split('T')[0],

        // Agency
        bankAccounts: agencySettings?.bankAccounts || [],
        consultatName: (trademark.consultant_name && trademark.consultant_name !== '-') ? trademark.consultant_name : '',
        consultantTitle: 'Marka Danışmanı'
    });

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Multi-select Marks State
    const [firmTrademarks, setFirmTrademarks] = useState<any[]>([]);

    const formatMarkName = (name: string | null, appNo: string | null) => {
        if (!name) return '';
        return appNo ? `${name} (${appNo})` : name;
    };

    const initialMarkName = formatMarkName(trademark.mark_name, trademark.application_no);
    const [selectedMarks, setSelectedMarks] = useState<string[]>(initialMarkName ? [initialMarkName] : []);
    const [isMarkSelectOpen, setIsMarkSelectOpen] = useState(false);

    // Fetch firm trademarks on mount
    useEffect(() => {
        getFirmTrademarks(firmId).then(marks => {
            setFirmTrademarks(marks);
        });
    }, [firmId]);

    useEffect(() => {
        // Update markName in formData when selection changes
        setFormData(prev => ({ ...prev, markName: selectedMarks.join(', ') }));
    }, [selectedMarks]);


    // Mail Preview State
    const [isMailPreviewOpen, setIsMailPreviewOpen] = useState(false);
    const [mailSubject, setMailSubject] = useState('Marka Bülten Takibi Yenileme Sözleşmesi Hk.');
    const [isSending, setIsSending] = useState(false);
    const [emailCC, setEmailCC] = useState<string[]>([]);
    const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);

    const editorRef = useRef<HTMLDivElement>(null);

    // Default Mail Content
    const defaultMailContent = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5;">
            <p>Merhabalar,</p>
            <br>
            <p>Ekte bilgileri yer alan markanızın bülten takip süresi sona ermiştir.</p>
            <p>Onayınız doğrultusunda, markanız <b>1 yıl süreyle</b> yeniden takibe alınacaktır.</p>
            <br>
            <p>Tarafınıza özel indirim uygulanmış olup, ödenmesi gereken tutar ekte bilgilerinize sunulmuştur.</p>
            <br>
            <p><b>İşlem sürelidir. ${validUntilDate} tarihine kadar olumlu ya da olumsuz bir geri dönüş yapılmaması halinde, markanız sistemden otomatik olarak düşecek ve izleme işlemleri durdurulacaktır.</b></p>
            <br>
            <p><b>“Bülten Takibi Hizmeti”</b> hakkında kısaca bilgi vermek isteriz:</p>
            <br>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li><b>1 yıl süreyle geçerlidir.</b></li>
                <li>Sektörünüzde markanıza <b>benzer veya aynı</b> başvurular düzenli olarak takip edilir.</li>
                <li>Her ay size aylık rapor gönderilir.</li>
                <li><b>Tescil edilmeden markayı iptal ettirme imkânı sunar.</b><br>
                &nbsp;&nbsp;&nbsp;&nbsp;&rarr; <u>Tescil edilen bir marka yalnızca mahkeme kararıyla iptal edilebilir.</u></li>
                <li>Böylece <b>mahkeme süreçlerine kıyasla çok daha düşük maliyetlerle</b> markanıza etkin koruma sağlanır.</li>
                <li>Benzer bir marka tespit edilirse, <b>itiraz süreci</b> başlatma imkânı sunar.</li>
                <li><b>Taklit ve karışıklıkları önleyerek</b> markanıza 360° koruma kazandırır.</li>
            </ul>
            <br>
            <p>Bu hizmet, markanızın uzun vadeli güvenliği ve sürdürülebilir değeri için <b>önemli bir yatırımdır.</b></p>
            <br>
            <p>Saygılarımla</p>
            <img src="https://qmotrqehdzebojdowuol.supabase.co/storage/v1/object/public/firm-logos/assets/mail-signature.png" alt="Üstün Patent" style="display: block; margin-top: 10px; width: 400px; height: auto;" />
        </div>
    `;

    const [mailContent, setMailContent] = useState(defaultMailContent);

    const updatePdf = useCallback(async () => {
        setIsGenerating(true);
        try {
            // Format Date for PDF: YYYY-MM-DD -> DD.MM.YYYY
            const formattedDate = formData.paymentDate
                ? new Date(formData.paymentDate).toLocaleDateString('tr-TR')
                : formData.paymentDate;

            const pdfData = { ...formData, paymentDate: formattedDate };
            const url = await generateContractPDF(pdfData);
            setPdfUrl(url.toString());
        } catch (e) {
            console.error(e);
            toast.error('PDF oluşturulamadı');
        } finally {
            setIsGenerating(false);
        }
    }, [formData]);

    // Initial PDF Generation
    useEffect(() => {
        updatePdf();
    }, [updatePdf]);

    // Debounced PDF update effect
    useEffect(() => {
        const timer = setTimeout(() => {
            updatePdf();
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData, updatePdf]);

    const handleInputChange = (field: keyof ContractData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMarkToggle = (markName: string) => {
        setSelectedMarks(prev => {
            if (prev.includes(markName)) {
                return prev.filter(m => m !== markName);
            } else {
                return [...prev, markName];
            }
        });
    };

    const handleAddToMail = async () => {
        if (pdfUrl) {
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            setGeneratedPdfBlob(blob);
            setEmailCC([]);
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

                const currentContent = editorRef.current?.innerHTML || mailContent;

                const result = await sendContractEmail(
                    firmId,
                    currentContent,
                    mailSubject,
                    [{ filename: `Sözleşme - ${formData.clientName}.pdf`, content: base64Content }],
                    emailCC
                );

                if (result.success) {
                    toast.success(result.message);
                    onClose();
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
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kime</label>
                            <div className="p-2 bg-gray-50 rounded border text-sm">{firmEmail || 'E-posta bulunamadı'}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Konu</label>
                            <input
                                value={mailSubject}
                                onChange={(e) => setMailSubject(e.target.value)}
                                className="w-full p-2 border rounded text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <MultiEmailInput
                                value={emailCC}
                                onChange={setEmailCC}
                                consultants={agencySettings?.consultants || []}
                            />
                        </div>

                        <div>
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">İçerik</label>
                                <div
                                    contentEditable
                                    ref={editorRef}
                                    dangerouslySetInnerHTML={{ __html: mailContent }}
                                    className="p-4 bg-gray-50 border rounded text-sm min-h-[200px] space-y-4 font-sans text-gray-800 focus:outline-blue-500"
                                />
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
                        Marka İzleme Sözleşmesi Oluştur - {trademark.mark_name}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <LucideX className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Form */}
                    <div className="w-1/3 border-r overflow-y-auto p-6 space-y-8 bg-[#001a4f]">
                        {/* 1. Müvekkil Firma Bilgileri */}
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

                            {/* Mark Name with Multi Select */}
                            <div className="relative">
                                <label className="block text-xs font-semibold text-white mb-1">Marka Adı (Çoklu Seçim)</label>
                                <div
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm bg-white text-gray-900 px-3 py-2 cursor-pointer min-h-[36px]"
                                    onClick={() => setIsMarkSelectOpen(!isMarkSelectOpen)}
                                >
                                    {formData.markName || 'Marka Seçiniz...'}
                                </div>
                                {isMarkSelectOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                        <div
                                            className="fixed inset-0 z-0"
                                            onClick={() => setIsMarkSelectOpen(false)}
                                        ></div>
                                        <div className="relative z-10">
                                            {firmTrademarks.map(t => {
                                                const label = formatMarkName(t.name, t.application_no);
                                                return (
                                                    <div
                                                        key={t.id}
                                                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                                                        onClick={() => handleMarkToggle(label)}
                                                    >
                                                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedMarks.includes(label) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                                                            {selectedMarks.includes(label) && <LucideCheck size={12} />}
                                                        </div>
                                                        <span className="text-sm text-gray-700">{label}</span>
                                                    </div>
                                                );
                                            })}
                                            {firmTrademarks.length === 0 && (
                                                <div className="p-3 text-sm text-gray-500 text-center">Marka bulunamadı.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <FormInput label="Marka Tipi" value={formData.markType} onChange={(v) => handleInputChange('markType', v)} />
                            <FormInput label="Mal veya Hizmetler" value={formData.goodsServices} onChange={(v) => handleInputChange('goodsServices', v)} multiline />
                            <FormInput label="Açıklama" value={formData.description} onChange={(v) => handleInputChange('description', v)} multiline />
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
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900 px-3 py-2"
                                    value={formData.consultatName}
                                    onChange={(e) => handleInputChange('consultatName', e.target.value)}
                                >
                                    <option value="">Seçiniz</option>
                                    {agencySettings?.consultants?.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
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
