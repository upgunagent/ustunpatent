'use client';

import { createTestUser, testLogin } from "@/actions/debug-login";
import { useState } from "react";

export default function DebugLoginPage() {
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const runTest = async () => {
        addLog("Creating test user...");
        const createRes = await createTestUser();
        addLog(JSON.stringify(createRes));

        if (createRes.success) {
            addLog("Attempting login...");
            const loginRes = await testLogin();
            addLog(JSON.stringify(loginRes));
        }
    };

    return (
        <div className="p-10 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">Login System Test</h1>
            <button onClick={runTest} className="bg-blue-600 text-white px-4 py-2 rounded">
                RUN TEST
            </button>
            <pre className="mt-4 bg-gray-100 p-4 rounded">{log.join('\n')}</pre>
        </div>
    );
}
