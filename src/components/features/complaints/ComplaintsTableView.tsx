import React from 'react';
import { SupportTicket } from '@/lib/types';
import { Trash2, Edit2 } from 'lucide-react';
import { Table, TableHeader, TableRow, TableCell, TableBody, TableEmpty, Badge, Button, Subtext } from '@/components/ui';

interface Props {
  tickets: SupportTicket[];
  onEdit: (t: SupportTicket) => void;
  onDelete: (id: number) => void;
}

export const ComplaintsTableView: React.FC<Props> = ({ tickets, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full relative">
      <Table>
      <TableHeader>
        <TableRow>
          <TableCell isHeader>ID</TableCell>
          <TableCell isHeader>Rincian Keluhan</TableCell>
          <TableCell isHeader>PIC Penanganan</TableCell>
          <TableCell isHeader className="text-center">Status</TableCell>
          <TableCell isHeader className="text-center">Aksi</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map(t => (
          <TableRow key={t.id}>
            <TableCell className="text-gray-400 font-mono">#{String(t.id).padStart(4, '0')}</TableCell>
            <TableCell className="font-bold">
              <Button 
                variant="ghost" 
                onClick={() => onEdit(t)} 
                className="!p-0 !h-auto font-bold text-gray-900 hover:text-rose-600 transition-all text-left uppercase tracking-tight block"
              >
                {t.title}
              </Button>
              <div className="flex items-center gap-2 mt-1">
                <Subtext className="text-[9px] text-gray-400 font-bold uppercase">{t.client?.name || 'Umum'}</Subtext>
                <Subtext className="text-gray-200 font-bold">•</Subtext>
                <span className={`!p-0 text-[8px] font-bold uppercase tracking-widest ${t.priority === 'urgent' ? 'text-rose-600' : 'text-gray-400'}`}>URGENSI: {t.priority}</span>
              </div>
            </TableCell>
            <TableCell className="px-6 py-6 font-bold text-gray-600">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-[10px] text-rose-600 font-bold uppercase border border-rose-100">{t.assigned_profile?.full_name?.charAt(0)}</div>
                   {t.assigned_profile?.full_name || 'Menunggu PIC'}
                </div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={t.status?.toLowerCase() === 'closed' ? 'secondary' : 'danger'} className="w-20 justify-center">
                {t.status}
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => onEdit(t)} className="!p-2 text-blue-500 hover:bg-blue-50 border border-transparent hover:border-blue-100"><Edit2 size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(t.id)} className="!p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100"><Trash2 size={14} /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {tickets.length === 0 && <TableEmpty colSpan={5} message="Tidak ada keluhan tercatat" />}
      </TableBody>
      </Table>
    </div>
  );
};
