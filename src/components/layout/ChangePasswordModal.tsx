'use client';

import { useState } from 'react';
import { LucideX, LucideSave, LucideLock } from 'lucide-react';
import { updatePassword } from '@/actions/auth';
import { toast } from 'sonner';

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        const password = formData.get('password') as string;
        const confirm = formData.get('confirm') as string;

        if (password !== confirm) {
            toast.error('Şifreler eşleşmiyor.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            toast.error('Şifre en az 6 karakter olmalıdır.');
            setLoading(false);
            return;
        }

        try {
            const result = await updatePassword(password);
            if (result.success) {
                toast.success('Şifreniz başarıyla güncellendi.');
                onClose();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <LucideLock size={20} className="text-[#001a4f]" />
                        Şifre Değiştir
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <LucideX size={24} />
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Yeni Şifre</label>
                        <input
                            name="password"
                            type="password"
                            required
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#001a4f]"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Yeni Şifre (Tekrar)</label>
                        <input
                            name="confirm"
                            type="password"
                            required
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#001a4f]"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-[#001a4f] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#002366] disabled:opacity-50 transition-colors"
                        >
                            <LucideSave size={16} />
                            {loading ? 'Güncelleniyor...' : 'Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
