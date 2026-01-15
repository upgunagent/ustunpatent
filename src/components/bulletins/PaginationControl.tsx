"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface PaginationControlProps {
    currentPage: number;
    totalPages: number;
    onPageChange?: (page: number) => void; // Opsiyonel callback (client-side pagination için)
}

export default function PaginationControl({
    currentPage,
    totalPages,
    onPageChange,
}: PaginationControlProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    const handlePageClick = (page: number, e?: React.MouseEvent) => {
        if (onPageChange) {
            // Client-side pagination callback varsa kullan
            e?.preventDefault();
            onPageChange(page);
        }
        // Yoksa Link'in default davranışı (URL değişimi) çalışacak
    };

    // Calculate start and end pages to show around current page
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-center gap-2 mt-4">
            <Link
                href={createPageURL(Math.max(1, currentPage - 1))}
                onClick={(e) => handlePageClick(Math.max(1, currentPage - 1), e)}
                className={cn(
                    "p-2 rounded-md border hover:bg-gray-100",
                    currentPage <= 1 && "pointer-events-none opacity-50"
                )}
                aria-disabled={currentPage <= 1}
            >
                <ChevronLeft size={20} />
            </Link>

            {startPage > 1 && (
                <>
                    <Link
                        href={createPageURL(1)}
                        onClick={(e) => handlePageClick(1, e)}
                        className={cn(
                            "px-4 py-2 rounded-md border hover:bg-gray-100",
                            currentPage === 1 && "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                        )}
                    >
                        1
                    </Link>
                    {startPage > 2 && <span className="text-gray-500">...</span>}
                </>
            )}

            {pages.map((page) => (
                <Link
                    key={page}
                    href={createPageURL(page)}
                    onClick={(e) => handlePageClick(page, e)}
                    className={cn(
                        "px-4 py-2 rounded-md border hover:bg-gray-100",
                        currentPage === page && "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                    )}
                >
                    {page}
                </Link>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
                    <Link
                        href={createPageURL(totalPages)}
                        onClick={(e) => handlePageClick(totalPages, e)}
                        className={cn(
                            "px-4 py-2 rounded-md border hover:bg-gray-100",
                            currentPage === totalPages && "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                        )}
                    >
                        {totalPages}
                    </Link>
                </>
            )}

            <Link
                href={createPageURL(Math.min(totalPages, currentPage + 1))}
                onClick={(e) => handlePageClick(Math.min(totalPages, currentPage + 1), e)}
                className={cn(
                    "p-2 rounded-md border hover:bg-gray-100",
                    currentPage >= totalPages && "pointer-events-none opacity-50"
                )}
                aria-disabled={currentPage >= totalPages}
            >
                <ChevronRight size={20} />
            </Link>
        </div>
    );
}
