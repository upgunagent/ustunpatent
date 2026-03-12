import React from 'react';
import { getAgencySettings } from '@/actions/settings';
import { createClient } from '@/lib/supabase/server';
import { getAllBulletinIssues } from '@/lib/bulletin';
import SettingsTabs from './SettingsTabs';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const data = await getAgencySettings();
    const supabase = await createClient();
    const bulletinOptions = await getAllBulletinIssues(supabase);

    return (
        <main className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Ajans Ayarları</h1>
                <p className="text-gray-500 mt-1">Firma bilgilerinizi, danışman kadronuzu ve bülten verilerinizi buradan yönetebilirsiniz.</p>
            </div>

            <SettingsTabs data={data} bulletinOptions={bulletinOptions} />
        </main>
    );
}
