import React, { useState, useEffect } from 'react';
import { Input, Textarea, Button, H3, Subtext, Card, ComboBox } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, AiSetting } from '@/lib/types';
import { Loader2, Save, BrainCircuit, Check, AlertTriangle, Cpu } from 'lucide-react';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';

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

  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' }>({
    isOpen: false, title: '', message: '', type: 'success'
  });

  useEffect(() => {
    fetchSettings();
  }, [company.id]);

  const fetchSettings = async () => {
    setLoading(true);
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
      setLoading(false);
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
      setNotification({ isOpen: true, title: 'Berhasil', message: 'Konfigurasi Gemini AI berhasil disimpan.', type: 'success' });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Memuat Konfigurasi AI...</Subtext></div>;

  return (
    <div className="max-w-3xl">
      <Card
        title={
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <BrainCircuit size={24} />
            </div>
            <div>
              <H3 className="text-xl normal-case">Konfigurasi Gemini AI</H3>
              <Subtext>Hubungkan workspace Anda dengan Google Gemini untuk fitur cerdas.</Subtext>
            </div>
          </div>
        }
      >
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
            >
              Simpan Konfigurasi
            </Button>
          </div>
        </form>
      </Card>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
};
