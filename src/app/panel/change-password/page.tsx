'use client';

import { useState } from 'react';
import { LucideSave, LucideLock } from 'lucide-react';
import { updatePassword } from '@/actions/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
                toast.success('Şifreniz başarıyla güncellendi. Yönlendiriliyorsunuz...');
                setTimeout(() => {
                    router.push('/panel/patent-can');
                }, 2000);
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
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
                <div className="mb-8 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#001a4f] mb-4">
                        <LucideLock size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Yeni Şifre Belirle</h1>
                    <p className="text-gray-500 mt-2 text-sm">Lütfen hesabınız için güvenli bir şifre belirleyin.</p>
                </div>

                <form action={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Yeni Şifre</label>
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="******"
                            className="flex h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:bg-white transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Yeni Şifre (Tekrar)</label>
                        <input
                            name="confirm"
                            type="password"
                            required
                            placeholder="******"
                            className="flex h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:bg-white transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#001a4f] px-6 py-3 text-sm font-medium text-white hover:bg-[#002366] disabled:opacity-50 transition-colors mt-4"
                    >
                        <LucideSave size={18} />
                        {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                    </button>
                </form>
            </div>
        </div>
    );
}
