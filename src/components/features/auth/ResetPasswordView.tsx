'use client';

import React, { useState, useEffect } from 'react';
import { Input, Button, H1, Subtext } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PlatformSettings } from '@/lib/types';

interface Props {
  platformSettings: PlatformSettings;
}

export const ResetPasswordView: React.FC<Props> = ({ platformSettings }) => {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Gagal memperbarui kata sandi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-50/20 -z-10 translate-x-1/3 rounded-full blur-[120px]"></div>
      
      <div className="max-w-sm w-full">
        <div className="mb-10 flex justify-center lg:justify-start">
          {platformSettings.logo_url ? (
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden bg-white rounded-3xl shadow-sm p-3 border border-gray-100">
              <img src={platformSettings.logo_url} className="max-w-full max-h-full object-contain" alt="Logo" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">CP</div>
          )}
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <H1 className="text-3xl font-bold">Berhasil!</H1>
            <Subtext className="text-gray-500">Kata sandi Anda telah diperbarui. Mengalihkan ke halaman login...</Subtext>
            <Button 
              onClick={() => router.push('/login')}
              variant="primary"
              className="w-full mt-4"
            >
              Kembali ke Login
            </Button>
          </div>
        ) : (
          <>
            <H1 className="text-[32px] font-bold text-[#0F172A] mb-2 leading-tight">Atur Ulang Kata Sandi</H1>
            <Subtext className="mb-8 text-gray-400 font-medium">Silakan masukkan kata sandi baru untuk akun Anda.</Subtext>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">KATA SANDI BARU</label>
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
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">KONFIRMASI KATA SANDI</label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock size={18} className="text-gray-300" />}
                  className="rounded-xl border-gray-100 bg-white"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 flex items-start gap-3 text-left">
                  <AlertTriangle size={16} className="shrink-0" />
                  <Subtext className="text-rose-600 text-xs leading-relaxed">{error}</Subtext>
                </div>
              )}

              <Button
                type="submit"
                isLoading={loading}
                variant="primary"
                className="w-full shadow-xl shadow-blue-100/50 font-bold"
                rightIcon={!loading && <ArrowRight size={18} />}
              >
                Simpan Kata Sandi
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
