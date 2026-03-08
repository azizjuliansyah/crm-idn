import React from 'react';
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, Label, Badge } from '@/components/ui';
import { SupportTicket } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { Trash2, Edit2, Zap } from 'lucide-react';

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
            <TableCell isHeader>Topik</TableCell>
            <TableCell isHeader>PIC Support</TableCell>
            <TableCell isHeader className="text-center">Status</TableCell>
            <TableCell isHeader className="text-center">Aksi</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map(t => (
            <TableRow key={t.id} className="group">
              <TableCell className="text-gray-400 font-mono">#{String(t.id).padStart(4, '0')}</TableCell>
              <TableCell className="">
                <Badge variant={t.type === 'complaint' ? 'danger' : 'primary'} className="uppercase  text-[8px] py-0.5">
                  {t.type || 'ticket'}
                </Badge>
              </TableCell>
              <TableCell>
                {t.title}
                <div className="flex items-center gap-2 mt-1">
                  <Label className="text-[9px] text-gray-600 uppercase ">{t.client?.name || 'Umum'}</Label>
                </div>
              </TableCell>
              <TableCell>
                {t.ticket_topics?.name ? (
                  <span>{t.ticket_topics.name}</span>
                ) : (
                  <span>-</span>
                )}
              </TableCell>
              <TableCell className=" text-gray-600">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center text-[10px]  uppercase shadow-sm">
                    {t.assigned_profile?.full_name?.charAt(0) || '?'}
                  </div>
                  <Label className="truncate text-gray-600 ">{t.assigned_profile?.full_name || '-'}</Label>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge variant={t.status?.toLowerCase() === 'closed' ? 'secondary' : t.status?.toLowerCase() === 'in progress' ? 'danger' : 'neutral'} className="min-w-[90px] w-auto whitespace-nowrap justify-center text-[9px] py-1 uppercase">
                    {t.status}
                  </Badge>
                  {t.priority && t.priority.toLowerCase() !== 'normal' && (
                    <div className={`px-2 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-sm border ${
                      t.priority.toLowerCase() === 'urgent' || t.priority.toLowerCase() === 'high' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      <Zap size={10} fill="currentColor" />
                      {t.priority}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-2">
                  <ActionButton
                    icon={Edit2}
                    variant="blue"
                    onClick={() => onEdit(t)}
                    title="Edit Tiket"
                  />
                  <ActionButton
                    icon={Trash2}
                    variant="rose"
                    onClick={() => onDelete(t.id)}
                    title="Hapus Tiket"
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {tickets.length === 0 && (
            <TableEmpty colSpan={7} message="Tidak ada ticket bantuan" />
          )}
        </TableBody>
      </Table>
    </div>
  );
};
