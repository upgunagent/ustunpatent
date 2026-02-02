'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LucideLoader2 } from 'lucide-react';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Giriş yapılıyor...');

    useEffect(() => {
        const handleAuth = async () => {
            const supabase = createClient();

            // 1. Check for Hash (Implicit Flow) or common errors
            const hash = window.location.hash;
            const error = searchParams.get('error');
            const code = searchParams.get('code');
            const next = searchParams.get('next') || '/panel/patent-can';

            if (error) {
                console.error("Auth Error (Params):", error);
                router.replace(`/auth/auth-code-error?error=${error}&error_description=${searchParams.get('error_description') || ''}`);
                return;
            }

            // 2. Handle PKCE Code
            if (code) {
                setStatus('Kod doğrulanıyor...');
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) {
                    console.error("Exchange Error:", exchangeError);
                    router.replace(`/auth/auth-code-error?error=${exchangeError.name}&error_description=${exchangeError.message}`);
                    return;
                }
                // Success
                router.replace(next);
                return;
            }

            // 3. Handle Implicit Hash (access_token)
            if (hash && hash.includes('access_token')) {
                setStatus('Oturum açılıyor...');

                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (session) {
                    router.replace(next);
                } else {
                    setTimeout(async () => {
                        const { data: { session: retrySession } } = await supabase.auth.getSession();
                        if (retrySession) {
                            router.replace(next);
                        } else {
                            console.error("Session missing after hash");
                            router.replace('/auth/auth-code-error?error=SessionMissing&error_description=Oturum açılamadı.');
                        }
                    }, 1000);
                }
                return;
            }

            // 4. Handle "No Code"
            console.warn("No code or hash found");
            router.replace('/auth/auth-code-error?error=NoCode&error_description=Doğrulama kodu bulunamadı.');
        };

        handleAuth();
    }, [router, searchParams]);

    return (
        <div className="flex flex-col items-center gap-4">
            <LucideLoader2 className="h-10 w-10 animate-spin text-[#001a4f]" />
            <p className="text-gray-600 font-medium">{status}</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
            <Suspense fallback={<div className="flex flex-col items-center gap-4"><LucideLoader2 className="h-10 w-10 animate-spin text-[#001a4f]" /><p>Yükleniyor...</p></div>}>
                <AuthCallbackContent />
            </Suspense>
        </div>
    );
}
