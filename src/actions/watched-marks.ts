'use server';

import { createClient } from '@/lib/supabase/server';

export interface WatchedTrademark {
    id: string;
    rights_owner: string | null;
    mark_name: string | null;
    watched_keywords: string | null;
    application_no: string | null;
    registration_date: string | null;
    classes: string | null;
    start_bulletin_no: string | null;
    watch_start_date: string | null;
    watch_end_date: string | null;
    last_bulletin_no: string | null;
    consultant_name: string | null;
    firm_email: string | null;
    firm_id: string;
    firm_info?: {
        name: string | null;
        corporate_title: string | null;
        individual_name_surname: string | null;
        type: string | null;
        address: string | null; // individual or corporate address
        phone: string | null;
        tc_no: string | null; // individual_tc
        born_date?: string | null; // individual_born_date
        tax_office: string | null;
        tax_number: string | null;
        email: string | null;
        website: string | null;
    }
}

export async function getWatchedTrademarks(year?: string, month?: string): Promise<WatchedTrademark[]> {
    const supabase = await createClient();

    let query = supabase
        .from('firm_trademarks')
        .select(`
            *,
            firms (
                id,
                name,
                corporate_title,
                individual_name_surname,
                corporate_title,
                individual_name_surname,
                representative,
                representative,
                email,
                type,
                phone,
                individual_tc,
                individual_born_date,
                individual_address,
                corporate_tax_office,
                corporate_tax_number,
                corporate_address,
                website
            )
        `)
        .eq('watch_agreement', true)
        .order('name', { ascending: true });

    // Apply Date Filters on watch_end_date
    if (year) {
        if (month) {
            // Filter by specific month
            const m = parseInt(month);
            const startDate = new Date(parseInt(year), m - 1, 1);
            // Adjust to local timezone offset if needed, but ISO string split approach is safer for dates stored as DATE type.
            // Actually, DATE type in postgres doesn't have time zone.
            // Let's use simple string construction.
            const startStr = `${year}-${month.padStart(2, '0')}-01`;

            // Get last day of month
            const lastDay = new Date(parseInt(year), m, 0).getDate();
            const endStr = `${year}-${month.padStart(2, '0')}-${lastDay}`;

            query = query.gte('watch_end_date', startStr).lte('watch_end_date', endStr);
        } else {
            // Filter by year
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            query = query.gte('watch_end_date', startDate).lte('watch_end_date', endDate);
        }
    }

    const { data: trademarks, error } = await query;

    if (error) {
        console.error('Error fetching watched trademarks:', error);
        throw new Error('İzlenen markalar alınırken hata oluştu.');
    }

    if (!trademarks || trademarks.length === 0) {
        return [];
    }

    // 2. Fetch last notification emails for each firm to determine "Last Bulletin No"
    // We need to do this efficiently. Fetching ALL actions might be heavy.
    // Strategy: Get distinct firm IDs, fetch their latest 'notification_email' action.
    const firmIds = Array.from(new Set(trademarks.map(t => t.firm_id)));

    // Fetch latest actions for these firms
    // Supabase doesn't support generic "latest per group" easily in one query without RPC.
    // For now, we'll fetch actions for these firms where type is 'notification_email' ordered by date desc.
    // If data is huge, this needs optimization (e.g. limit).
    const { data: actions, error: actionsError } = await supabase
        .from('firm_actions')
        .select('firm_id, metadata, created_at')
        .eq('type', 'notification_email')
        .in('firm_id', firmIds)
        .order('created_at', { ascending: false });

    if (actionsError) {
        console.error('Error fetching firm actions:', actionsError);
        // Continue without last bulletin info rather than crashing
    }

    // Map firmId to Last Bulletin No
    const firmLastBulletinMap = new Map<string, string>();

    if (actions) {
        for (const action of actions) {
            // Since actions are ordered by created_at desc, the first one we encounter for a firm is the latest.
            if (!firmLastBulletinMap.has(action.firm_id)) {
                const content = action.metadata?.full_content as string;
                if (content) {
                    const bulletinNo = extractBulletinNoFromContent(content);
                    if (bulletinNo) {
                        firmLastBulletinMap.set(action.firm_id, bulletinNo);
                    }
                }
            }
        }
    }

    // 3. Transform to WatchedTrademark format
    return trademarks.map(t => {
        const firm = t.firms as any; // Type assertion since Supabase types might be complex
        const rightsOwner = t.rights_owner || firm?.corporate_title || firm?.individual_name_surname || firm?.name || '-';

        let watchedKeywords = t.name || '';
        if (t.search_keywords) {
            watchedKeywords += `, ${t.search_keywords}`;
        }

        return {
            id: t.id,
            rights_owner: rightsOwner,
            mark_name: t.name,
            watched_keywords: watchedKeywords,
            application_no: t.application_no,
            registration_date: t.registration_date,
            classes: t.classes,
            start_bulletin_no: t.start_bulletin_no,
            watch_start_date: t.watch_start_date,
            watch_end_date: t.watch_end_date,
            last_bulletin_no: firmLastBulletinMap.get(t.firm_id) || '-',
            consultant_name: t.consultant_name || firm?.representative || '-',
            firm_email: firm?.email || null,
            firm_id: t.firm_id,
            firm_info: firm ? {
                name: firm.name,
                corporate_title: firm.corporate_title,
                individual_name_surname: firm.individual_name_surname,
                type: firm.type,
                address: firm.type === 'individual' ? firm.individual_address : firm.corporate_address,
                phone: firm.phone,
                tc_no: firm.individual_tc,
                born_date: firm.individual_born_date,
                tax_office: firm.corporate_tax_office,
                tax_number: firm.corporate_tax_number,
                email: firm.email,
                website: firm.website
            } : undefined
        };
    });
}

function extractBulletinNoFromContent(content: string): string | null {
    // Regex to find "XXX sayılı" or "XXX ve YYY sayılı"
    // Example patterns in mail:
    // "<b>09.02.2026 tarih ve 485 sayılı</b> Resmi Marka Bülteninde"
    // "<b>09.02.2026 tarih ve 484 ve 485 sayılı</b> Resmi Marka Bülteninde"

    try {
        // Find all numbers followed by "sayılı"
        // This is a bit complex due to "ve"
        // Simplified approach: Look for pattern "... sayılı" and extract numbers immediately preceding it.

        // Match numbers that are close to "sayılı"
        // Matches: "485 sayılı", "484 ve 485 sayılı"
        // Limit lookbehind or context to avoid matching dates

        const match = content.match(/(\d+(?:\s+ve\s+\d+)*)\s+sayılı/);

        if (match && match[1]) {
            const numbersStr = match[1];
            // Split by " ve " or spaces to get individual numbers
            const numbers = numbersStr.split(/\D+/).filter(Boolean).map(n => parseInt(n));

            if (numbers.length > 0) {
                // Return the max number
                return Math.max(...numbers).toString();
            }
        }

        return null;
    } catch (e) {
        console.error('Error extracting bulletin no:', e);
        return null;
    }
}
