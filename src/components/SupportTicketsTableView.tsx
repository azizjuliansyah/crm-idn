import React from 'react';
import { SupportTicket } from '@/lib/types';
import { Trash2, Edit2 } from 'lucide-react';

interface Props {
  tickets: SupportTicket[];
  onEdit: (t: SupportTicket) => void;
  onDelete: (id: number) => void;
}

export const SupportTicketsTableView: React.FC<Props> = ({ tickets, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full relative">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">ID</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Tipe</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Informasi Ticket</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">PIC Support</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-[11px]">
            {tickets.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 group transition-colors">
                <td className="px-6 py-6 text-gray-400 font-mono">#{String(t.id).padStart(4, '0')}</td>
                <td className="px-6 py-6">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${t.type === 'complaint' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                    {t.type || 'ticket'}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <button onClick={() => onEdit(t)} className="font-bold text-gray-900 hover:text-rose-600 transition-all text-left uppercase tracking-tight block">
                    {t.title}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase">{t.client?.name || 'Umum'}</span>
                    <span className="text-gray-200 font-bold">•</span>
                    <span className={`text-[8px] font-bold uppercase ${t.priority === 'urgent' ? 'text-rose-500' : 'text-gray-400'}`}>URGENSI: {t.priority}</span>
                  </div>
                </td>
                <td className="px-6 py-6 font-bold text-gray-600">
                    <div className="flex items-center gap-2 h-full py-auto">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 uppercase">{t.assigned_profile?.full_name?.charAt(0)}</div>
                        <span className="truncate">{t.assigned_profile?.full_name || '-'}</span>
                    </div>
                </td>
                <td className="px-6 py-6 text-center">
                  <span className={`px-3 py-1 text-[9px] font-bold uppercase rounded-full border bg-rose-50 text-rose-600 border-rose-100`}>{t.status}</span>
                </td>
                <td className="px-6 py-6 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(t)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg shadow-sm border border-transparent hover:border-blue-100 transition-all"><Edit2 size={14} /></button>
                    <button onClick={() => onDelete(t.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg shadow-sm border border-transparent hover:border-rose-100 transition-all"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && <tr><td colSpan={6} className="py-24 text-center opacity-10 italic text-[10px] uppercase font-bold">Tidak ada ticket bantuan</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
