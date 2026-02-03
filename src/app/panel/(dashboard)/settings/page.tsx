import React from 'react';
import { getAgencySettings } from '@/actions/settings';
import SettingsTabs from './SettingsTabs';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const data = await getAgencySettings();

    return (
        <main className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Ajans Ayarları</h1>
                <p className="text-gray-500 mt-1">Firma bilgilerinizi ve danışman kadronuzu buradan yönetebilirsiniz.</p>
            </div>

            <SettingsTabs data={data} />
        </main>
    );
}
