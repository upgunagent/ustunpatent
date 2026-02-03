'use client';

import React from 'react';
import { AgencyData } from '@/actions/settings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FirmInfoTab from './FirmInfoTab';
import ConsultantsTab from './ConsultantsTab';

interface Props {
    data: AgencyData;
}

export default function SettingsTabs({ data }: Props) {
    return (
        <Tabs defaultValue="firm-info" className="space-y-8">
            <div className="pb-2">
                <TabsList className="bg-transparent h-auto p-0 space-x-2">
                    <TabsTrigger
                        value="firm-info"
                        className="px-6 py-2.5 rounded-md data-[state=active]:bg-[#001a4f] data-[state=active]:text-white text-gray-500 hover:text-[#001a4f] hover:bg-blue-50 transition-all text-base font-semibold shadow-sm data-[state=active]:shadow-md"
                    >
                        Firma Bilgileri
                    </TabsTrigger>
                    <TabsTrigger
                        value="consultants"
                        className="px-6 py-2.5 rounded-md data-[state=active]:bg-[#001a4f] data-[state=active]:text-white text-gray-500 hover:text-[#001a4f] hover:bg-blue-50 transition-all text-base font-semibold shadow-sm data-[state=active]:shadow-md"
                    >
                        Danışmanlar
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="firm-info" className="focus-visible:outline-none animate-in fade-in slide-in-from-left-4 duration-300">
                <FirmInfoTab data={data} />
            </TabsContent>

            <TabsContent value="consultants" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                <ConsultantsTab data={data} />
            </TabsContent>
        </Tabs>
    );
}
