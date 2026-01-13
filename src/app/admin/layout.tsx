import Link from "next/link";
import { LucideLayoutDashboard, LucideMessageSquare, LucideLogOut } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-muted/20">
                <div className="flex h-16 items-center px-6 border-b">
                    <span className="text-lg font-bold">UstunPatent Panel</span>
                </div>
                <nav className="flex flex-col gap-1 p-4">
                    <Link
                        href="/admin/patent-can"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                        <LucideMessageSquare size={18} />
                        PatentCan
                    </Link>
                    <div className="mt-auto pt-4 border-t">
                        <Link
                            href="/login"
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
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
