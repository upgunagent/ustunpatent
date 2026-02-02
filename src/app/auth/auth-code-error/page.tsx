import Link from "next/link";
import { LucideAlertCircle } from "lucide-react";

export default async function AuthCodeErrorPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
    const params = await searchParams;
    const error = params.error || "Bilinmeyen Hata";
    const description = params.error_description || "Doğrulama linki geçersiz veya süresi dolmuş.";

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-200 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 mb-6">
                    <LucideAlertCircle size={28} />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-3">Bağlantı Hatası</h1>

                <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                    <p className="font-semibold text-red-700 text-sm mb-1">
                        {error}
                    </p>
                    <p className="text-red-600 text-sm">
                        {description.replace(/\+/g, ' ')}
                    </p>
                </div>

                <p className="text-gray-600 mb-8 leading-relaxed">
                    Şifre sıfırlama linkinizin süresi dolmuş veya daha önce kullanılmış olabilir.
                    Lütfen tekrar şifre sıfırlama talebinde bulunun.
                </p>

                <Link
                    href="/login"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-[#001a4f] px-6 py-3 text-sm font-medium text-white hover:bg-[#002366] transition-colors"
                >
                    Giriş Sayfasına Dön
                </Link>
            </div>
        </div>
    );
}
