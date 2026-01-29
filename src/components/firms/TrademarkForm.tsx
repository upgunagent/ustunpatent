'use client';

import { useState } from 'react';
import { LucidePlus, LucideX, LucideSave, LucideCheckCircle } from 'lucide-react';
import { addTrademark, updateTrademark } from '@/actions/firms';
import { useFormStatus } from 'react-dom';

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-[#001a4f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#002366] disabled:opacity-50"
        >
            <LucideSave size={16} />
            {pending ? (isEditing ? 'Güncelleniyor...' : 'Ekleniyor...') : (isEditing ? 'Güncelle' : 'Ekle')}
        </button>
    );
}

interface TrademarkFormProps {
    firmId: string;
    onClose: () => void;
    initialData?: any; // If provided, we are in edit mode
}

export default function TrademarkForm({ firmId, onClose, initialData }: TrademarkFormProps) {
    const isEditing = !!initialData;
    const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logo_url || null);

    // Parse existing classes if any
    const initialClasses = initialData?.classes
        ? initialData.classes.split(',').map(Number)
        : [];

    const [selectedClasses, setSelectedClasses] = useState<number[]>(initialClasses);

    const toggleClass = (classNo: number) => {
        setSelectedClasses(prev =>
            prev.includes(classNo)
                ? prev.filter(c => c !== classNo)
                : [...prev, classNo].sort((a, b) => a - b)
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setLogoPreview(objectUrl);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        formData.append('firm_id', firmId);
        formData.append('classes', selectedClasses.join(','));

        // If editing, append ID and existing logo URL (as fallback if no new file)
        if (isEditing) {
            formData.append('trademark_id', initialData.id);
            const file = formData.get('logo_file') as File;
            if ((!file || file.size === 0) && initialData.logo_url) {
                formData.append('logo_url', initialData.logo_url);
            }
        }

        try {
            if (isEditing) {
                await updateTrademark(formData);
            } else {
                await addTrademark(formData);
            }
            onClose();
        } catch (error) {
            alert(isEditing ? 'Güncellenirken bir hata oluştu' : 'Eklenirken bir hata oluştu');
            console.error(error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                        {isEditing ? 'Marka Detayları / Düzenle' : 'Yeni Marka Ekle'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <LucideX size={24} />
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-6">

                    <div className="grid gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="watch_agreement"
                                defaultChecked={initialData?.watch_agreement}
                                className="w-5 h-5 rounded border-gray-300 text-[#001a4f] focus:ring-[#001a4f]"
                            />
                            <span className="text-sm font-medium text-gray-700">Marka İzleme Sözleşmesi Mevcut</span>
                        </label>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 block mb-2">Marka Logosu</label>
                            <div className="flex gap-4 items-center">
                                <div className="h-20 w-20 rounded-lg border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative shrink-0">
                                    {logoPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={logoPreview} alt="Preview" className="h-full w-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-gray-400 text-center px-1">Görsel Yok</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        name="logo_file"
                                        type="file"
                                        accept="image/*"
                                        className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#001a4f]/10 file:text-[#001a4f] hover:file:bg-[#001a4f]/20 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Logo görselini seçin (Max 5MB)</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Marka Adı</label>
                            <input
                                name="name"
                                type="text"
                                required
                                defaultValue={initialData?.name}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Hak Sahibi</label>
                            <input
                                name="rights_owner"
                                type="text"
                                defaultValue={initialData?.rights_owner}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Başvuru No</label>
                            <input
                                name="application_no"
                                type="text"
                                defaultValue={initialData?.application_no}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
                        </div>

                        {/* Marka Sınıfları */}
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                Marka Sınıfları ({selectedClasses.length} Seçili)
                            </label>
                            <div className="grid grid-cols-9 gap-2 p-4 rounded-lg border border-gray-200 bg-gray-50">
                                {Array.from({ length: 45 }, (_, i) => i + 1).map((classNo) => (
                                    <button
                                        key={classNo}
                                        type="button"
                                        onClick={() => toggleClass(classNo)}
                                        className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-all ${selectedClasses.includes(classNo)
                                            ? 'bg-[#001a4f] text-white shadow-md scale-110'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:border-[#001a4f] hover:text-[#001a4f]'
                                            }`}
                                    >
                                        {classNo}
                                    </button>
                                ))}
                            </div>
                            <input type="hidden" name="classes_dummy" value={selectedClasses.join(',')} />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">Başlangıç Bülten No</label>
                            <input
                                name="start_bulletin_no"
                                type="text"
                                defaultValue={initialData?.start_bulletin_no}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">İzleme Başlangıç Tarihi</label>
                            <input
                                name="watch_start_date"
                                type="date"
                                defaultValue={initialData?.watch_start_date}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">İzleme Bitiş Tarihi</label>
                            <input
                                name="watch_end_date"
                                type="date"
                                defaultValue={initialData?.watch_end_date}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
                        </div>

                        <div className="grid gap-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Danışman Adı</label>
                            <input
                                name="consultant_name"
                                type="text"
                                defaultValue={initialData?.consultant_name}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            İptal
                        </button>
                        <SubmitButton isEditing={isEditing} />
                    </div>
                </form>
            </div>
        </div>
    );
}
