'use client';

import React, { useState, useEffect } from 'react';
import { Input, Textarea, Button, H2, Subtext, ComboBox, Toast, ToastType } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, AiSetting } from '@/lib/types';
import { Loader2, Save, BrainCircuit, Cpu } from 'lucide-react';

interface Props {
  company: Company;
}

export const AiSettingsView: React.FC<Props> = ({ company }) => {
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<AiSetting | null>(null);

  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.0-flash');
  const [instruction, setInstruction] = useState('');

  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  useEffect(() => {
    fetchSettings(true);
  }, [company.id]);

  const fetchSettings = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const { data } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (data) {
        setSettings(data);
        setApiKey(data.gemini_api_key || '');
        setModelName(data.model_name || 'gemini-2.0-flash');
        setInstruction(data.system_instruction || '');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload = {
        company_id: company.id,
        gemini_api_key: apiKey,
        model_name: modelName,
        system_instruction: instruction,
        updated_at: new Date().toISOString()
      };

      if (settings?.id) {
        await supabase
          .from('ai_settings')
          .update(payload)
          .eq('id', settings.id);
      } else {
        await supabase
          .from('ai_settings')
          .insert(payload);
      }

      await fetchSettings();
      showToast('Konfigurasi Gemini AI berhasil disimpan.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><Subtext className="text-[10px] uppercase text-gray-400">Memuat Konfigurasi AI...</Subtext></div>;

  return (
    <div className="max-w-3xl flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <H2 className="text-xl">Konfigurasi Gemini AI</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Hubungkan workspace Anda dengan Google Gemini untuk fitur cerdas.</Subtext>
        </div>
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
          <BrainCircuit size={20} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <ComboBox
            label="Model Gemini"
            value={modelName}
            onChange={val => setModelName(val as string)}
            options={[
              { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', sublabel: 'Terbaru, Tercepat & Pintar' },
              { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', sublabel: 'Cepat & Efisien' },
              { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', sublabel: 'Paling Canggih' },
            ]}
            leftIcon={<Cpu size={16} />}
            hideSearch
          />

          <Input
            label="Gemini API Key"
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="font-mono text-sm"
            placeholder="Ex: AIzaSy..."
          />
          <Subtext className="text-[11px] -mt-4 ml-1">Dapatkan API Key di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>.</Subtext>

          <Textarea
            label="System Instruction (Persona)"
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            rows={6}
            placeholder="Berikan instruksi bagaimana AI harus berperilaku, nada bicara, dan batasan pengetahuannya..."
          />

          <div className="pt-2">
            <Button
              type="submit"
              isLoading={isProcessing}
              leftIcon={!isProcessing && <Save size={16} />}
              variant='primary'
              className="!px-8 shadow-lg shadow-indigo-100"
            >
              Simpan Konfigurasi
            </Button>
          </div>
        </form>
      </div>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
