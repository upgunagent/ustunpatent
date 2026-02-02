'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LucideFileText, LucideSearch, LucideBriefcase, LucideEye, LucideLogOut, LucideLock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from 'react';
import ChangePasswordModal from "./ChangePasswordModal";

export default function Sidebar() {
    const pathname = usePathname();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const isActive = (href: string) => {
        return pathname.startsWith(href);
    };

    return (
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
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive('/panel/patent-can') ? 'bg-white/10' : 'hover:bg-white/10'
                        }`}
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
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive('/panel/bulletins') ? 'bg-white/10' : 'hover:bg-white/10'
                        }`}
                >
                    <LucideFileText size={24} />
                    Bültenler
                </Link>
                <Link
                    href="/panel/marka-izleme"
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive('/panel/marka-izleme') ? 'bg-white/10' : 'hover:bg-white/10'
                        }`}
                >
                    <LucideEye size={24} />
                    Marka İzleme
                </Link>
                <Link
                    href="/panel/marka-arastirma"
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive('/panel/marka-arastirma') ? 'bg-white/10' : 'hover:bg-white/10'
                        }`}
                >
                    <LucideSearch size={24} />
                    Marka Araştırma
                </Link>
                <Link
                    href="/panel/firms"
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive('/panel/firms') ? 'bg-white/10' : 'hover:bg-white/10'
                        }`}
                >
                    <LucideBriefcase size={24} />
                    Firmalar
                </Link>

                <div className="mt-auto pt-4 border-t border-white/10 pb-8 space-y-1">
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <LucideLock size={18} />
                        Şifre Değiştir
                    </button>
                    <Link
                        href="/login"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
                    >
                        <LucideLogOut size={18} />
                        Çıkış Yap
                    </Link>
                </div>
            </nav>

            {isPasswordModalOpen && (
                <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
            )}
        </aside>
    );
}
