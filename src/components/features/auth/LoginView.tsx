
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Mail, Lock, Loader2, ChevronLeft, CheckCircle2, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { PlatformSettings } from '@/lib/types';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useRouter } from 'next/navigation';
import { 
  Button, 
  Input, 
  Subtext, 
  H3, 
  Label 
} from '@/components/ui';

interface Props {
  platformSettings: PlatformSettings;
}

type AuthMode = 'login' | 'forgot';

export const LoginView: React.FC<Props> = ({ platformSettings }) => {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  
  const captchaRef = useRef<HCaptcha>(null);

  // Debugging log untuk memantau sinkronisasi pengaturan
  useEffect(() => {
    console.log("LoginView - Sync Status:", {
      enabled: platformSettings.hcaptcha_enabled,
      siteKey: platformSettings.hcaptcha_site_key ? 'Terisi (Hidden)' : 'KOSONG'
    });

    // Reset error teknis jika pengaturan berubah
    if (platformSettings.hcaptcha_enabled && !platformSettings.hcaptcha_site_key) {
      setTechnicalError("Konfigurasi Error: hCaptcha diaktifkan tetapi Site Key kosong di database.");
    } else {
      setTechnicalError(null);
    }
  }, [platformSettings]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleCaptchaError = (err: any) => {
    console.error("hCaptcha Widget Error:", err);
    setTechnicalError(`hCaptcha Error: ${err || 'Gagal memuat widget. Pastikan domain crm.raabu.com sudah di-whitelist di dashboard hCaptcha.'}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Proteksi sisi client
    if (platformSettings.hcaptcha_enabled && platformSettings.hcaptcha_site_key && !captchaToken) {
       setError("Harap centang kotak verifikasi keamanan hCaptcha di bawah.");
       return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: { captchaToken }
        });
        
        if (signInError) throw signInError;
        router.push('/dashboard');
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + '/reset-password', // Adjusted for Next.js structure
          captchaToken
        });
        
        if (resetError) throw resetError;
        setSuccess("Link reset password telah dikirim ke email Anda.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Auth Exception:", err);
      
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
        setCaptchaToken(undefined);
      }
      
      let friendlyMessage = err.message;
      if (err.message?.includes('Invalid login credentials')) {
        friendlyMessage = "Email atau password salah.";
      } else if (err.message?.toLowerCase().includes('captcha')) {
        friendlyMessage = "Verifikasi gagal (Server Error).";
        setTechnicalError("Troubleshoot: Jika widget muncul tapi validasi gagal (Error 500), pastikan HCAPTCHA_SECRET_KEY di dashboard Supabase (Authentication > Protection) sudah benar.");
      }
      
      setError(friendlyMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-gray-900 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-50/20 -z-10 translate-x-1/3 rounded-full blur-[120px]"></div>
      
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 items-center justify-center p-24 border-r border-gray-100 relative">
        <div className="max-w-md w-full relative z-10">
          {platformSettings.logo_url ? (
            <div className="mb-10 w-24 h-24 flex items-center justify-center overflow-hidden bg-white rounded-3xl shadow-sm p-4 border border-gray-100">
               <img src={platformSettings.logo_url} className="max-w-full max-h-full object-contain" alt="Logo" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white font-bold text-3xl shadow-2xl shadow-blue-200 mb-10">CP</div>
          )}
          
          <h1 className="text-5xl font-bold text-gray-900 tracking-tighter leading-[1.1] mb-6">
            Kelola Bisnis Jadi Lebih <span className="text-blue-600 underline decoration-blue-100 underline-offset-8">Pintar</span>.
          </h1>
          <p className="text-lg text-gray-500 font-medium leading-relaxed">
            Platform {platformSettings.name} membantu Anda mengelola ekosistem bisnis dalam satu dashboard yang aman dan terintegrasi.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-white">
        <div className="max-w-sm w-full">
          <div className="mb-10 lg:hidden flex justify-center">
            {platformSettings.logo_url ? (
              <img src={platformSettings.logo_url} className="h-12 w-auto object-contain" alt="Logo" />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">CP</div>
            )}
          </div>
          
          {mode === 'login' ? (
            <>
              <H3 className="text-3xl normal-case text-center lg:text-left mb-2">Akses Portal</H3>
              <Subtext className="mb-10 text-center lg:text-left">Masuk untuk melanjutkan ke dashboard Anda.</Subtext>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest mb-6 transition-colors"
              >
                <ChevronLeft size={14} /> Kembali Login
              </button>
              <H3 className="text-3xl normal-case mb-2">Lupa Kata Sandi?</H3>
              <Subtext className="mb-10">Masukkan email untuk mendapatkan tautan pemulihan.</Subtext>
            </>
          )}

          {success && (
            <div className="mb-8 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
              <Subtext className="text-emerald-700 font-bold leading-relaxed">{success}</Subtext>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Alamat Email"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              leftIcon={<Mail size={18} />}
              required
            />

            {mode === 'login' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label>Password</Label>
                  <button 
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                    className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
                  >
                    Lupa Password?
                  </button>
                </div>
                <Input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock size={18} />}
                  required={mode === 'login'}
                />
              </div>
            )}

            {/* hCaptcha Component & Error Feedback */}
            {platformSettings.hcaptcha_enabled && platformSettings.hcaptcha_site_key && (
              <div className="space-y-3">
                <div key={platformSettings.hcaptcha_site_key} className="flex flex-col items-center gap-3 py-2">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={platformSettings.hcaptcha_site_key}
                    reCaptchaCompat={false}
                    onVerify={(token) => { setCaptchaToken(token); setTechnicalError(null); }}
                    onExpire={() => setCaptchaToken(undefined)}
                    onError={handleCaptchaError}
                  />
                  {technicalError && (
                    <div className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3 text-left">
                      <Info size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                         <Label className="text-indigo-900 block">Technical Info</Label>
                         <Subtext className="text-indigo-700 leading-relaxed text-[10px]">{technicalError}</Subtext>
                         <button type="button" onClick={() => window.location.reload()} className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 uppercase hover:underline mt-2">
                           <RefreshCw size={10} /> Reload Widget
                         </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {platformSettings.hcaptcha_enabled && !platformSettings.hcaptcha_site_key && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-left">
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <Label className="text-rose-900 block">Captcha Misconfigured</Label>
                  <Subtext className="text-rose-700 leading-relaxed text-[10px]">hCaptcha aktif tetapi Site Key belum diatur oleh administrator sistem.</Subtext>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 flex items-start gap-3 text-left">
                <AlertTriangle size={16} className="shrink-0" />
                <Subtext className="text-rose-600 font-bold leading-relaxed">{error}</Subtext>
              </div>
            )}

            <Button 
              type="submit"
              isLoading={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 shadow-blue-100"
              rightIcon={!loading && <ArrowRight size={18} />}
            >
              Masuk Sekarang
            </Button>
          </form>

          <p className="mt-12 text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">
             CRM ID-Networkers
          </p>
        </div>
      </div>
    </div>
  );
};
