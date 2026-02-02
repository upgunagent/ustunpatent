'use client';

import { useState } from 'react';
import { LucideX, LucideSend, LucideKeyRound, LucideUnlock } from 'lucide-react';
import { requestPasswordResetOTP, verifyOTP } from '@/actions/auth-admin';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const router = useRouter();

    const handleSendCode = async (formData: FormData) => {
        setLoading(true);
        const inputEmail = formData.get('email') as string;
        setEmail(inputEmail);

        try {
            const result = await requestPasswordResetOTP(inputEmail);
            if (result.success) {
                setStep('otp');
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (formData: FormData) => {
        setLoading(true);
        const code = formData.get('code') as string;

        try {
            const result = await verifyOTP(email, code);
            if (result.success && result.redirectUrl) {
                toast.success('Doğrulama başarılı! Yönlendiriliyorsunuz...');
                // Redirect to the hidden link which will log the user in
                window.location.href = result.redirectUrl;
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Kod doğrulama hatası.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <LucideKeyRound size={20} className="text-[#001a4f]" />
                        {step === 'email' ? 'Şifremi Unuttum' : 'Kodu Doğrula'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <LucideX size={24} />
                    </button>
                </div>

                {step === 'email' ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Hesabınıza kayıtlı e-posta adresinizi giriniz. Size 6 haneli bir doğrulama kodu göndereceğiz.
                        </p>

                        <form action={handleSendCode} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">E-posta Adresi</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="ornek@ustunpatent.com"
                                    className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:bg-white"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#001a4f] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#002366] disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
                            <b>{email}</b> adresine gönderilen 6 haneli kodu giriniz.
                        </div>

                        <form action={handleVerifyCode} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Doğrulama Kodu</label>
                                <input
                                    name="code"
                                    type="text"
                                    required
                                    placeholder="123456"
                                    maxLength={6}
                                    className="flex h-12 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-[#001a4f] focus:bg-white"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#001a4f] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#002366] disabled:opacity-50 transition-colors"
                                >
                                    <LucideUnlock size={18} />
                                    {loading ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep('email')}
                                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 underline"
                            >
                                E-posta adresini değiştir
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
