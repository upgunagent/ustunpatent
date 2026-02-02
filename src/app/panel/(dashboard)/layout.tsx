import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />

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
