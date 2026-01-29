import Link from "next/link";
import { LucideLayoutDashboard, LucideMessageSquare, LucideLogOut, LucideFileText, LucideSearch, LucideBriefcase, LucideEye } from "lucide-react";
import Image from "next/image";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-[#001a4f] text-white flex flex-col h-[calc(100vh)] sticky top-0">
                <div className="flex h-16 items-center px-6 border-b border-white/10 shrink-0">
                    <div className="relative h-8 w-40">
                        <Image
                            src="/sidebar-logo.png"
                            alt="UstunPatent Logo"
                            fill
                            className="object-contain object-left"
                            unoptimized
                        />
                    </div>
                </div>
                <nav className="flex flex-col gap-1 p-4 flex-1">
                    <Link
                        href="/panel/patent-can"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                        <div className="relative h-6 w-6">
                            <Image
                                src="/ustun_avatar_balon.png"
                                alt="PatentCan Avatar"
                                fill
                                className="object-cover rounded-full"
                                unoptimized
                            />
                        </div>
                        PatentCan
                    </Link>
                    <Link
                        href="/panel/bulletins"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                        <LucideFileText size={24} />
                        Bültenler
                    </Link>
                    <Link
                        href="/panel/marka-izleme"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                        <LucideEye size={24} />
                        Marka İzleme
                    </Link>
                    <Link
                        href="/panel/marka-arastirma"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                        <LucideSearch size={24} />
                        Marka Araştırma
                    </Link>
                    <Link
                        href="/panel/firms"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                        <LucideBriefcase size={24} />
                        Firmalar
                    </Link>
                    <div className="mt-auto pt-4 border-t border-white/10 pb-8">
                        <Link
                            href="/login"
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
                        >
                            <LucideLogOut size={18} />
                            Çıkış Yap
                        </Link>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-background">
                <div className="h-16 border-b flex items-center px-8 bg-background/50 backdrop-blur sticky top-0 z-10 w-full">
                    <h2 className="font-semibold">Yönetim Paneli</h2>
                </div>
                <div className="p-8">{children}</div>
            </main>
        </div>
    );
}
