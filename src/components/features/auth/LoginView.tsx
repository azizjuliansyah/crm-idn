
'use client';

import React, { useState, useEffect, useRef } from 'react';

import { Input, Button, H1, H3, Subtext, Label } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { ArrowRight, Mail, Lock, Loader2, ChevronLeft, CheckCircle2, AlertTriangle, Info, RefreshCw, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { PlatformSettings } from '@/lib/types';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useRouter } from 'next/navigation';

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
  const [showPassword, setShowPassword] = useState(false);

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
        setSuccess("Link pemulihan telah dikirim! Silakan periksa kotak masuk email Anda (dan folder spam jika tidak ditemukan). Tautan akan aktif selama 24 jam.");
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
            <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white  text-3xl shadow-2xl shadow-blue-200 mb-10">CP</div>
          )}

          <H1 className="text-[44px] !font-bold text-gray-900  leading-[1.1] mb-6">
            Kelola Bisnis Jadi <br /> Lebih <span className="text-blue-600 relative inline-block">
              Pintar
              <span className="absolute bottom-1 left-0 w-full h-[6px] bg-blue-100/60 -z-10 rounded-full"></span>
            </span>.
          </H1>
          <Subtext className="text-[17px] text-gray-400 font-medium leading-[1.6]">
            Platform {platformSettings.name} membantu Anda mengelola ekosistem bisnis dalam satu dashboard yang aman dan terintegrasi.
          </Subtext>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-white">
        <div className="max-w-sm w-full">
          <div className="mb-10 lg:hidden flex justify-center">
            {platformSettings.logo_url ? (
              <img src={platformSettings.logo_url} className="h-12 w-auto object-contain" alt="Logo" />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white  text-xl">CP</div>
            )}
          </div>

          {mode === 'login' ? (
            <>
              <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-blue-600 mb-4 transition-colors group uppercase tracking-wider">
                <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-1" />
                Back to Home
              </Link>
              <h2 className="text-[32px] font-bold text-[#0F172A] mb-1">Akses Portal</h2>
              <Subtext className="mb-6 text-[15px] text-gray-400 font-medium">Masuk untuk melanjutkan ke dashboard Anda.</Subtext>
            </>
          ) : (
            <>
              <Button
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="flex items-center gap-2 !font-bold text-gray-400 hover:text-blue-600  text-[10px] uppercase  mb-6 transition-colors"
              >
                <ChevronLeft size={14} /> Kembali Login
              </Button>
              <H3 className="text-3xl !font-bold mb-2">Lupa Kata Sandi?</H3>
              <Subtext className="mb-6 font-medium">Masukkan email untuk mendapatkan tautan pemulihan.</Subtext>
            </>
          )}

          {success && (
            <div className="mb-8 p-6 bg-blue-50/50 border border-blue-100 rounded-[24px] flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-blue-600/10 text-blue-600 rounded-full flex items-center justify-center">
                <Mail size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900">Periksa Email Anda</h4>
                <Subtext className="text-blue-800 text-[13px] leading-relaxed px-2">{success}</Subtext>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSuccess(null)}
                className="text-blue-600 font-bold hover:bg-blue-100/50"
              >
                Kirim Ulang?
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">ALAMAT EMAIL</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                leftIcon={<Mail size={18} className="text-gray-300" />}
                className="rounded-xl border-gray-100 bg-white"
                required
              />
            </div>

            {mode === 'login' && (
              <div className="">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">PASSWORD</label>
                  <Link
                    href="#"
                    onClick={(e) => { 
                      e.preventDefault();
                      setMode('forgot'); 
                      setError(null); 
                      setSuccess(null); 
                    }}
                    className="text-[10px] font-semibold text-blue-600 uppercase hover:underline"
                  >
                    Lupa Password?
                  </Link>
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock size={18} className="text-gray-300" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-blue-600 transition-colors focus:outline-none flex items-center justify-center"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                  className="rounded-xl border-gray-100 bg-white"
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
                        <Button type="button" onClick={() => window.location.reload()} className="flex items-center gap-1.5 text-[9px]  text-indigo-600 uppercase hover:underline mt-2">
                          <RefreshCw size={10} /> Reload Widget
                        </Button>
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
                <Subtext className="text-rose-600  leading-relaxed">{error}</Subtext>
              </div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              variant="primary"
              className="w-full shadow-xl shadow-blue-100/50 font-bold "
              rightIcon={!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
            >
              Masuk Sekarang
            </Button>
          </form>

          <div className="mt-16 text-center">
            <Subtext className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.4em]">
              CRM ID-NETWORKERS
            </Subtext>
          </div>
        </div>
      </div>
    </div>
  );
};
