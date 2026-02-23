import React from 'react';
import { SupportTicket } from '@/lib/types';
import { Trash2, Edit2 } from 'lucide-react';
import { Table, TableHeader, TableRow, TableCell, TableBody, TableEmpty, Badge, Button } from '@/components/ui';

interface Props {
  tickets: SupportTicket[];
  onEdit: (t: SupportTicket) => void;
  onDelete: (id: number) => void;
}

export const SupportTicketsTableView: React.FC<Props> = ({ tickets, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full relative">
      <Table>
          <TableHeader className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
            <TableRow>
              <TableCell isHeader>ID</TableCell>
              <TableCell isHeader>Tipe</TableCell>
              <TableCell isHeader>Informasi Ticket</TableCell>
              <TableCell isHeader>PIC Support</TableCell>
              <TableCell isHeader className="text-center">Status</TableCell>
              <TableCell isHeader className="text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-gray-400 font-mono">#{String(t.id).padStart(4, '0')}</TableCell>
                <TableCell className="font-bold">
                  <Badge variant={t.type === 'complaint' ? 'danger' : 'primary'} className="uppercase tracking-widest text-[8px] py-0.5">
                    {t.type || 'ticket'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    onClick={() => onEdit(t)} 
                    className="!p-0 !h-auto font-bold text-gray-900 hover:text-rose-600 transition-all text-left uppercase tracking-tight block"
                  >
                    {t.title}
                  </Button>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase">{t.client?.name || 'Umum'}</span>
                    <span className="text-gray-200 font-bold">•</span>
                    <span className={`!p-0 text-[8px] font-bold uppercase ${t.priority === 'urgent' ? 'text-rose-500' : 'text-gray-400'}`}>
                      URGENSI: {t.priority}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-bold text-gray-600">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center text-[10px] font-bold uppercase shadow-sm">
                          {t.assigned_profile?.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="truncate text-xs tracking-tight">{t.assigned_profile?.full_name || '-'}</span>
                    </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="danger" className="w-20 justify-center text-[8px] py-1 uppercase tracking-widest font-bold">
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(t)} 
                      className="!p-2 text-blue-500 hover:bg-blue-50 border border-transparent hover:border-blue-100 shadow-none"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDelete(t.id)} 
                      className="!p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 shadow-none"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableEmpty colSpan={6} message="Tidak ada ticket bantuan" />
            )}
          </TableBody>
      </Table>
    </div>
  );
};
