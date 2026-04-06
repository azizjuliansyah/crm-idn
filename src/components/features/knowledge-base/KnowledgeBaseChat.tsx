'use client';

import React, { useState, useEffect, useRef } from 'react';

import { Input, Button, Subtext, Label } from '@/components/ui';

import { AiSetting, KbArticle, ChatMessage } from '@/lib/types';
import { useAppStore } from '@/lib/store/useAppStore';
import {
  Sparkles, Bot, X, Send, SearchCode, ShieldCheck,
  ArrowRight, Link as LinkIcon, BookOpen, User, Loader2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  articles: KbArticle[];
  aiSetting: AiSetting | null;
  onNavigate?: (path: string) => void;
  onOpenArticle: (article: KbArticle) => void;
}


// Helper component to format AI text beautifully
const FormattedAiResponse: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  const formatLine = (line: string) => {
    // Replace **text** with stylized bold spans
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Label key={i} className=" text-indigo-700 bg-indigo-50/50 px-1 rounded-sm">
            {part.slice(2, -2)}
          </Label>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-3 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Handle Bullet Lists
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex gap-3 pl-2 py-0.5">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 shadow-sm shadow-indigo-200" />
              <Subtext className="text-[13px] font-medium text-gray-700 flex-1">
                {formatLine(trimmed.slice(2))}
              </Subtext>
            </div>
          );
        }

        // Handle Empty lines for spacing
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Standard Text line
        return (
          <Subtext key={idx} className="text-[13px] font-medium text-gray-700">
            {formatLine(line)}
          </Subtext>
        );
      })}
    </div>
  );
};

export const KnowledgeBaseChat: React.FC<Props> = ({
  isOpen, onClose, articles, aiSetting, onNavigate, onOpenArticle
}) => {
  const { kbChatMessages: chatMessages, setKbChatMessages: setChatMessages } = useAppStore();
  const [currentInput, setCurrentInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [retrievalStatus, setRetrievalStatus] = useState<string | null>(null);

  // Initialize with welcome message if empty
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        { role: 'bot', text: 'Halo! Saya asisten cerdas pusat bantuan Anda. Saya akan mencari jawaban hanya dari artikel yang tersedia untuk membantu Anda.' }
      ]);
    }
  }, [chatMessages.length]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isApiKeyActive = !!aiSetting?.gemini_api_key && aiSetting.gemini_api_key.trim() !== '';

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  // RAG Logic: Keyword-based Retrieval
  const retrieveRelevantArticles = (query: string, allArticles: KbArticle[], limit = 3) => {
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);

    const scored = allArticles.map(art => {
      let score = 0;
      const title = art.title.toLowerCase();
      const content = art.content.toLowerCase();

      keywords.forEach(word => {
        if (title.includes(word)) score += 10;
        if (content.includes(word)) score += 2;
      });

      return { article: art, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.article);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveApiKey = aiSetting?.gemini_api_key;
    if (!currentInput.trim() || isThinking || !effectiveApiKey) return;

    const userMsg = currentInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setCurrentInput('');
    setIsThinking(true);
    setRetrievalStatus('Mencari data lokal...');

    try {
      const relevantArticles = retrieveRelevantArticles(userMsg, articles, 3);
      
      setRetrievalStatus(relevantArticles.length > 0 ? `Menganalisis ${relevantArticles.length} artikel relevan...` : 'Menganalisis pesan...');

      const context = relevantArticles.length > 0 
        ? relevantArticles.map(a => `JUDUL: ${a.title}\nKONTEN: ${a.content.substring(0, 1500)}`).join('\n\n---\n\n')
        : '';

      const systemInstruction = aiSetting?.system_instruction || 'Anda adalah AI Customer Support yang cerdas dan efisien.';
      const prompt = `
        ${context ? `BERIKUT ADALAH KONTEKS DARI BASIS PENGETAHUAN KAMI:\n${context}` : 'TIDAK ADA KONTEKS RELEVAN DARI BASIS PENGETAHUAN.'}

        TUGAS ANDA:
        1. Jika pesan pengguna adalah sapaan (halo, test, hi, selamat pagi, dll), balas dengan ramah dan tanyakan bantuan apa yang diperlukan.
        2. Jika pesan pengguna adalah pertanyaan, jawab menggunakan KONTEKS di atas. JANGAN memberikan informasi di luar konteks tersebut.
        3. Jika pertanyaan tidak ada di KONTEKS dan bukan sapaan, sampaikan dengan sopan bahwa informasi tersebut tidak ditemukan di basis pengetahuan kami.
        4. Gunakan format markdown (**tebal**, bullet point) untuk kejelasan.
        5. Jawablah secara singkat, padat, dan profesional dalam Bahasa Indonesia.

        PERTANYAAN PENGGUNA: "${userMsg}"
      `;

      const model = aiSetting?.model_name || 'gemini-2.5-flash';
      // Use v1 for stable 2.5 models, v1beta for experimental 3.0 models
      const apiVersion = model.includes('3.0') ? 'v1beta' : 'v1';
      
      const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${effectiveApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `System Instruction: ${systemInstruction}\n\n${prompt}` }]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP Error ${response.status}: Silakan periksa validitas API Key.`);
      }

      const data = await response.json();
      const botMsg = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak dapat memproses jawaban saat ini.';
      setChatMessages(prev => [...prev, { role: 'bot', text: botMsg, references: relevantArticles }]);
    } catch (err: any) {
      console.error("AI Error Details:", err);
      const errorMessage = err.message || "Gagal melakukan request AI.";
      setChatMessages(prev => [...prev, { 
        role: 'bot', 
        text: `Error: ${errorMessage}\n\nPastikan API Key di halaman Konfigurasi Gemini sudah aktif dan memiliki kuota yang cukup.` 
      }]);
    } finally {
      setIsThinking(false);
      setRetrievalStatus(null);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onClose} // acts as open when closed
        variant='primary'
        className="fixed bottom-8 right-8 z-[60] w-16 h-16 active:scale-95 transition-all group"
      >
        <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />
      </Button>
    );
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-[55] bg-transparent cursor-default" 
        onClick={onClose}
      />
      <div className="fixed bottom-8 right-8 z-[60] w-[640px] bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[760px] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-indigo-600 p-5 text-white flex items-center justify-between shadow-lg relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Sparkles size={120} /></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl">
            <Bot size={28} />
          </div>
          <div>
            <h5 className=" text-sm uppercase  leading-none mb-1.5">Knowledge Assistant</h5>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse shadow-sm ${isApiKeyActive ? 'bg-emerald-400 shadow-emerald-400' : 'bg-rose-400 shadow-rose-400'}`}></div>
              <Subtext className="text-[10px] opacity-80 text-white uppercase ">
                {isApiKeyActive ? `${aiSetting?.model_name}` : 'AI Not Configured'}
              </Subtext>
            </div>
          </div>
        </div>
        <Button onClick={onClose} size='sm' className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors relative z-10"><X size={22} /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white">
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] p-3.5 rounded-2xl shadow-sm border ${msg.role === 'user'
              ? 'bg-indigo-600 text-white border-transparent rounded-tr-none'
              : 'bg-gray-50/50 border-gray-100 rounded-tl-none'
              }`}>
              {msg.role === 'user' ? (
                <div className="text-[13px] leading-relaxed  whitespace-pre-wrap">{msg.text}</div>
              ) : (
                <FormattedAiResponse text={msg.text} />
              )}

              {msg.references && msg.references.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-200/50">
                  <div className="flex items-center gap-2 mb-3 text-indigo-600">
                    <div className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center"><LinkIcon size={10} /></div>
                    <Label className="text-[9px]  uppercase tracking-[0.15em]">Sumber Knowledge Base:</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.references.map(ref => (
                      <Button
                        key={ref.id}
                        onClick={() => onOpenArticle(ref)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-[10px]  text-gray-600 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md transition-all"
                      >
                        <BookOpen size={10} className="opacity-50" />
                        <Label className="truncate max-w-[150px]">{ref.title}</Label>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl rounded-tl-none flex flex-col gap-2.5 shadow-sm min-w-[120px]">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-700 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              {retrievalStatus && (
                <Subtext className="text-[10px]  text-gray-400 uppercase  animate-pulse flex items-center gap-2">
                  <SearchCode size={12} className="text-indigo-400" /> {retrievalStatus}
                </Subtext>
              )}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-50 shrink-0">
        {!isApiKeyActive ? (
          <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-amber-600" />
              <Subtext className="text-[11px]  text-amber-900 uppercase  leading-none">Aktivasi AI Diperlukan</Subtext>
            </div>
            <Subtext className="text-[10px] text-amber-700 leading-relaxed font-medium">
              Chatbot belum aktif karena **Gemini API Key** khusus workspace ini belum diatur.
            </Subtext>
            {onNavigate && (
              <Button
                onClick={() => onNavigate('pengaturan_ai')}
                className="w-full py-4 bg-amber-600 text-white rounded-2xl  text-[10px] uppercase  shadow-lg shadow-amber-200 flex items-center justify-center gap-2 hover:bg-amber-700 active:scale-95 transition-all"
              >
                Konfigurasi AI Sekarang <ArrowRight size={12} />
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleChatSubmit} className="flex gap-2.5 items-stretch">
            <div className="relative flex-1 group">
              <input
                type="text"
                value={currentInput}
                onChange={e => setCurrentInput(e.target.value)}
                placeholder="Ketik pertanyaan Anda..."
                disabled={isThinking}
                className="w-full h-14 bg-gray-50/50 hover:bg-gray-50 px-6 rounded-2xl text-[13px] font-medium outline-none border border-transparent focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all shadow-inner placeholder:text-gray-400 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isThinking || !currentInput.trim()}
              className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-indigo-100"
              title="Kirim Pesan"
            >
              {isThinking ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} className={currentInput.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
              )}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
    </>
  );
};
