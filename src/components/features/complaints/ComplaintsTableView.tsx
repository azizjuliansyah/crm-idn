import React from 'react';
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, Subtext, Label, Badge } from '@/components/ui';
import { SupportTicket } from '@/lib/types';
import { Trash2, Edit2 } from 'lucide-react';

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
            <TableCell isHeader>Topik</TableCell>
            <TableCell isHeader>PIC Penanganan</TableCell>
            <TableCell isHeader className="text-center">Status</TableCell>
            <TableCell isHeader className="text-center">Aksi</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map(t => (
            <TableRow key={t.id} className="group">
              <TableCell className="text-gray-400 font-mono">#{String(t.id).padStart(4, '0')}</TableCell>
              <TableCell>
                {t.title}
                <div className="flex items-center gap-2 mt-1">
                  <Label className="text-[9px] text-gray-600 uppercase tracking-tight">{t.client?.name || 'Umum'}</Label>
                  <Label className="text-gray-200 ">•</Label>
                  <Label className={`!p-0 text-[8px] uppercase tracking-tight ${t.priority === 'urgent' ? 'text-rose-500' : 'text-gray-400'}`}>
                    URGENSI: {t.priority}
                  </Label>
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
                  <Label className="truncate text-gray-600">{t.assigned_profile?.full_name || '-'}</Label>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={t.status?.toLowerCase() === 'closed' ? 'secondary' : 'danger'} className="w-20 justify-center">
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(t)}
                    className="!p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Keluhan"
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(t.id)}
                    className="!p-2 text-rose-700 !bg-transparent hover:!bg-rose-50 shadow-none hover:border-rose-200 transition-all border border-transparent rounded-lg"
                    title="Hapus Keluhan"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {tickets.length === 0 && <TableEmpty colSpan={7} message="Tidak ada keluhan tercatat" />}
        </TableBody>
      </Table>
    </div>
  );
};
