'use client';

import React, { useState, useEffect, useRef } from 'react';

import { Input, Button, Subtext, Label } from '@/components/ui';

import { GoogleGenAI } from '@google/genai';
import { AiSetting, KbArticle } from '@/lib/types';
import {
  Sparkles, Bot, X, Send, SearchCode, ShieldCheck,
  ArrowRight, Link as LinkIcon, BookOpen, User
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  articles: KbArticle[];
  aiSetting: AiSetting | null;
  onNavigate?: (path: string) => void;
  onOpenArticle: (article: KbArticle) => void;
}

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  references?: KbArticle[];
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: 'Halo! Saya asisten cerdas pusat bantuan Anda. Saya akan mencari jawaban hanya dari artikel yang tersedia untuk membantu Anda.' }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [retrievalStatus, setRetrievalStatus] = useState<string | null>(null);
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
      if (relevantArticles.length === 0) {
        setChatMessages(prev => [...prev, { role: 'bot', text: 'Maaf, saya tidak menemukan informasi yang relevan di basis pengetahuan perusahaan kami untuk menjawab pertanyaan tersebut.' }]);
        setIsThinking(false);
        setRetrievalStatus(null);
        return;
      }

      setRetrievalStatus(`Menganalisis ${relevantArticles.length} artikel relevan...`);

      // Note: Using standard fetch or GoogleGenAI SDK depending on environment
      // Here we assume GoogleGenAI is available as imported
      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      const context = relevantArticles.map(a => `JUDUL: ${a.title}\nKONTEN: ${a.content.substring(0, 1500)}`).join('\n\n---\n\n');

      const prompt = `BERIKUT ADALAH KONTEKS DARI BASIS PENGETAHUAN KAMI:\n${context}\n\nTUGAS ANDA:\n1. Jawab pertanyaan pengguna HANYA berdasarkan konteks di atas.\n2. Jika jawaban tidak ada di konteks, katakan dengan jujur bahwa info tersebut tidak tersedia.\n3. Jawab dengan format markdown sederhana (gunakan ** untuk menebalkan poin penting dan gunakan list * untuk rincian).\n4. Jawab dengan singkat dan padat.\n5. Gunakan bahasa Indonesia yang profesional.\n\nPERTANYAAN PENGGUNA: "${userMsg}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash', // Updated to a more standard model name if available, or keep gemini-1.5-flash
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        config: {
          systemInstruction: aiSetting?.system_instruction || 'Anda adalah AI Customer Support yang cerdas dan efisien.',
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 800
        }
      });

      const botMsg = response?.text || 'Maaf, saya tidak dapat memproses jawaban saat ini.';
      setChatMessages(prev => [...prev, { role: 'bot', text: botMsg, references: relevantArticles }]);
    } catch (err: any) {
      console.error("AI Error:", err);
      setChatMessages(prev => [...prev, { role: 'bot', text: `Gagal melakukan request AI. Pastikan API Key di halaman Konfigurasi Gemini sudah benar dan valid.` }]);
    } finally {
      setIsThinking(false);
      setRetrievalStatus(null);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onClose} // acts as open when closed
        className="fixed bottom-8 right-8 z-[60] w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group"
      >
        <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-[60] w-[440px] bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[600px]">
      <div className="bg-indigo-600 p-7 text-white flex items-center justify-between shadow-lg relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Sparkles size={120} /></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl">
            <Bot size={28} />
          </div>
          <div>
            <h5 className=" text-sm uppercase tracking-tight leading-none mb-1.5">Knowledge Assistant</h5>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse shadow-sm ${isApiKeyActive ? 'bg-emerald-400 shadow-emerald-400' : 'bg-rose-400 shadow-rose-400'}`}></div>
              <Subtext className="text-[10px] opacity-80  uppercase tracking-tight">
                {isApiKeyActive ? 'Active (Private Key)' : 'AI Not Configured'}
              </Subtext>
            </div>
          </div>
        </div>
        <Button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors relative z-10"><X size={22} /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-7 space-y-7 custom-scrollbar bg-white">
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] p-5 rounded-[1.8rem] shadow-sm border ${msg.role === 'user'
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
            <div className="bg-gray-50 border border-gray-100 p-5 rounded-[1.5rem] rounded-tl-none flex flex-col gap-3 shadow-sm min-w-[140px]">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-indigo-700 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              {retrievalStatus && (
                <Subtext className="text-[10px]  text-gray-400 uppercase tracking-tight animate-pulse flex items-center gap-2">
                  <SearchCode size={12} className="text-indigo-400" /> {retrievalStatus}
                </Subtext>
              )}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-6 bg-white border-t border-gray-50 shrink-0">
        {!isApiKeyActive ? (
          <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-amber-600" />
              <Subtext className="text-[11px]  text-amber-900 uppercase tracking-tight leading-none">Aktivasi AI Diperlukan</Subtext>
            </div>
            <Subtext className="text-[10px] text-amber-700 leading-relaxed font-medium">
              Chatbot belum aktif karena **Gemini API Key** khusus workspace ini belum diatur.
            </Subtext>
            {onNavigate && (
              <Button
                onClick={() => onNavigate('pengaturan_ai')}
                className="w-full py-4 bg-amber-600 text-white rounded-2xl  text-[10px] uppercase tracking-tight shadow-lg shadow-amber-200 flex items-center justify-center gap-2 hover:bg-amber-700 active:scale-95 transition-all"
              >
                Konfigurasi AI Sekarang <ArrowRight size={12} />
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleChatSubmit} className="flex gap-3">
            <Input
              type="text"
              value={currentInput}
              onChange={e => setCurrentInput(e.target.value)}
              placeholder="Ketik pertanyaan Anda..."
              disabled={isThinking}
              className="flex-1 bg-gray-50 px-6 py-4 rounded-2xl text-sm  outline-none focus:bg-white focus:border-indigo-300 transition-all border border-transparent shadow-inner"
            />
            <Button
              type="submit"
              disabled={isThinking || !currentInput.trim()}
              className="w-14 h-14 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-30 active:scale-90 transition-all shadow-xl shadow-indigo-100 shrink-0 flex items-center justify-center"
            >
              <Send size={22} />
            </Button>
          </form>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};
