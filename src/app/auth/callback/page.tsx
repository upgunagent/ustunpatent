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

        // 1. Setup Listener (Automatic handling)
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
            // 2. Check for explicit error params
            const error = searchParams.get('error');
            if (error) {
                console.error("Auth Error (Params):", error);
                router.replace(`/auth/auth-code-error?error=${error}&error_description=${searchParams.get('error_description') || ''}`);
                return;
            }

            // 3. Check for PKCE Code
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

            // 4. Check for Implicit Hash (access_token)
            const hash = window.location.hash;
            if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
                setStatus('Oturum anahtarı işleniyor...');

                // MANUAL PARSING: Force session set if auto-detection is slow
                try {
                    // Remove # and parse
                    const hashParams = new URLSearchParams(hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    const type = hashParams.get('type');

                    if (accessToken && refreshToken) {
                        console.log("Manual token parsing successful");
                        const { error: setSessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });

                        if (!setSessionError) {
                            console.log("Manual session set successful");
                            router.replace(next);
                            return;
                        } else {
                            console.error("Manual SetSession Error:", setSessionError);
                        }
                    }
                } catch (e) {
                    console.error("Manual parsing failed:", e);
                }

                // Fallback: Wait for listener or check session one last time
                setTimeout(async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                        console.error("Session Missing Timeout");
                        // Check one more time just in case
                        const { data: { session: retrySession } } = await supabase.auth.getSession();
                        if (retrySession) {
                            router.replace(next);
                        } else {
                            router.replace('/auth/auth-code-error?error=Timeout&error_description=Oturum zaman aşımı. Lütfen tekrar deneyin.');
                        }
                    } else {
                        router.replace(next);
                    }
                }, 4000);
            } else if (!code && !hash) {
                // 5. No Code/Hash found - Check explicit session
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
