
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Profile, AiSetting } from '@/lib/types';
import { Loader2, Send, Bot, User, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
// import ReactMarkdown from 'react-markdown'; // Assuming we might want markdown later, but keeping simple for now

interface Props {
  company: Company;
  user: Profile;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  created_at: Date;
}

export const AiAssistantView: React.FC<Props> = ({ company, user }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Halo ${user.full_name}! Saya adalah asisten AI Anda. Ada yang bisa saya bantu terkait data CRM atau tugas harian Anda?`,
      created_at: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AiSetting | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSettings();
  }, [company.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      setSettings(data);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!settings?.gemini_api_key) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: 'Maaf, konfigurasi API Key belum diatur. Silakan hubungi admin untuk mengatur Workspace Setup > Konfigurasi Gemini.',
        created_at: new Date()
      }]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      created_at: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // NOTE: This should ideally be a backend call to protect the API key. 
      // For this client-side demo/implementation where key is stored in DB:
      // We will make a direct call to Gemini API using the key from settings.
      // WARNING: exposing keys in client is risky if settings are readable by all users.
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.gemini_api_key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            // Include system instruction if supported by the endpoint structure or prepend it
            // Gemini 1.5/2.0 often takes system_instruction field
            {
              role: 'user',
              parts: [{ text: settings.system_instruction ? `System Instruction: ${settings.system_instruction}\n\nUser Question: ${userMsg.content}` : userMsg.content }]
            }
          ]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch response');
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak dapat memproses permintaan Anda saat ini.';

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: reply,
        created_at: new Date()
      }]);

    } catch (err: any) {
      console.error('AI Error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `Error: ${err.message}. Pastikan API Key valid.`,
        created_at: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (configLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">AI Workspace Assistant</h3>
            <p className="text-[10px] text-gray-400 font-medium">Powered by Gemini 2.0 Flash</p>
          </div>
        </div>
        {!settings?.gemini_api_key && (
           <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold">
              <AlertCircle size={12} /> API Key Missing
           </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-gray-200' : 'bg-indigo-600 text-white'}`}>
              {msg.role === 'user' ? <User size={14} className="text-gray-500" /> : <Bot size={14} />}
            </div>
            
            <div className={`max-w-[80%] space-y-1 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
              <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-white border border-gray-100 text-gray-800 rounded-tr-none' 
                  : 'bg-white border border-indigo-100 text-gray-800 rounded-tl-none'
              }`}>
                {msg.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-1 last:mb-0">{line}</p>
                ))}
              </div>
              <span className="text-[10px] text-gray-300 font-medium px-1">
                {msg.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex gap-4">
             <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-indigo-600 text-white">
                <Bot size={14} />
             </div>
             <div className="bg-white border border-indigo-100 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form 
          onSubmit={handleSend} 
          className="flex items-end gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-2 py-2 focus-within:bg-white focus-within:border-indigo-200 focus-within:ring-4 focus-within:ring-indigo-50/50 transition-all"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ketik pesan Anda disini..."
            className="w-full bg-transparent border-none outline-none resize-none text-sm max-h-32 min-h-[44px] py-3 px-3 placeholder:text-gray-400"
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0 mb-0.5"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-300 mt-2 font-medium">AI dapat membuat kesalahan. Mohon verifikasi informasi penting.</p>
      </div>
    </div>
  );
};
