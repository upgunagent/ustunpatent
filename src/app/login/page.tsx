import { login } from "./actions";
import Image from "next/image";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen w-full">
            {/* Left Side - Branding (Black) */}
            <div className="hidden w-1/2 flex-col items-center justify-center bg-black p-10 text-white lg:flex">
                <div className="max-w-md text-center">
                    <div className="mb-8 flex justify-center">
                        <div className="relative h-32 w-80">
                            <Image
                                src="/login-logo.png"
                                alt="Ustun Patent Logo"
                                fill
                                className="object-contain"
                                priority
                                unoptimized
                            />
                        </div>
                    </div>
                    <h2 className="mb-4 text-3xl font-bold tracking-tight">
                        Patent Sorgulama ve CRM Platformu
                    </h2>
                    <p className="text-gray-400 leading-relaxed">
                        Yapay zeka destekli patent analizi ve müşteri ilişkileri yönetimi.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form (White) */}
            <div className="flex w-full flex-col items-center justify-center bg-white p-8 lg:w-1/2">
                <div className="w-full max-w-sm space-y-6">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                            Yönetici Girişi
                        </h1>
                        <p className="text-sm text-gray-500">
                            Panele erişmek için bilgilerinizi giriniz
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-2xl shadow-gray-100">
                        <form className="grid gap-6">
                            <div className="grid gap-2">
                                <label
                                    htmlFor="email"
                                    className="text-xs font-medium uppercase tracking-wide text-gray-500"
                                >
                                    E-posta
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="ornek@ustunpatent.com"
                                    required
                                    className="flex h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="text-xs font-medium uppercase tracking-wide text-gray-500"
                                    >
                                        Şifre
                                    </label>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="flex h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
                                />
                            </div>
                            <button
                                formAction={login}
                                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-black px-8 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 mt-2"
                            >
                                Giriş Yap
                            </button>
                        </form>
                    </div>
                    <p className="px-8 text-center text-sm text-gray-400">
                        &copy; 2026 Üstün Patent. Tüm hakları saklıdır.
                    </p>
                </div>
            </div>
        </div>
    );
}
