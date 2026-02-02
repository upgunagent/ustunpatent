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
        const supabase = createClient();
        const next = searchParams.get('next') || '/panel/change-password';

        // Listen for Auth State Changes (The reliable way for Hash flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth Event:", event);
            if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
                if (session) {
                    setStatus('Başarılı! Yönlendiriliyorsunuz...');
                    router.replace(next);
                }
            }
        });

        const handleAuth = async () => {
            // 1. Check for errors
            const error = searchParams.get('error');
            if (error) {
                console.error("Auth Error (Params):", error);
                router.replace(`/auth/auth-code-error?error=${error}&error_description=${searchParams.get('error_description') || ''}`);
                return;
            }

            // 2. PKCE Code Exchange (Explicit)
            const code = searchParams.get('code');
            if (code) {
                setStatus('Kod doğrulanıyor...');
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) {
                    console.error("Exchange Error:", exchangeError);
                    router.replace(`/auth/auth-code-error?error=${exchangeError.name}&error_description=${exchangeError.message}`);
                }
                return;
            }

            // 3. Implicit Hash Check (Access Token)
            const hash = window.location.hash;
            if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
                setStatus('Oturum açılıyor...');
                // The onAuthStateChange listener will handle the redirect.
                // We just wait here. 

                // Fallback timeout if nothing happens in 5 seconds
                setTimeout(async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                        console.error("Session Missing Timeout");
                        // Don't redirect error immediately, just log. 
                        // User might be stuck strictly speaking, but redirecting to error premature is annoying.
                        // But if 5 seconds passed and no session, likely failed.
                        router.replace('/auth/auth-code-error?error=Timeout&error_description=Oturum zaman aşımı.');
                    } else {
                        router.replace(next);
                    }
                }, 5000);
            } else if (!code && !hash) {
                // 4. No Code/Hash found
                // Check if we are already logged in?
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    router.replace(next);
                } else {
                    console.warn("No code or hash found");
                    router.replace('/auth/auth-code-error?error=NoCode&error_description=Doğrulama kodu bulunamadı.');
                }
            }
        };

        handleAuth();

        return () => {
            subscription.unsubscribe();
        };
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
