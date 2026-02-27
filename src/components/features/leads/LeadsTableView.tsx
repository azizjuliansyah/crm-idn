import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, Subtext, Label, Badge, Checkbox } from '@/components/ui';
import { Lead } from '@/lib/types';
import { Table as TableIcon, Trash2, ChevronUp, ChevronDown, Clock } from 'lucide-react';

interface Props {
  leads: Lead[];
  // Change key type to any to support keyof Lead | 'sales_name' from parent state
  sortConfig: { key: any; direction: 'asc' | 'desc' } | null;
  onSort: (key: any) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
  formatIDR: (num?: number) => string;
}

export const LeadsTableView: React.FC<Props> = ({
  leads, sortConfig, onSort, selectedIds, onToggleSelect,
  onToggleSelectAll, onEdit, onDelete, formatIDR
}) => {
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ChevronUp size={12} className="text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-500 ml-1" /> : <ChevronDown size={12} className="text-blue-500 ml-1" />;
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'info';
      case 'qualified': return 'success';
      case 'unqualified': return 'danger';
      case 'working': return 'warning';
      default: return 'primary';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full relative">
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader className="w-10 text-center">
              <Checkbox
                checked={leads.length > 0 && selectedIds.length === leads.length}
                onChange={onToggleSelectAll}
                variant="blue"
              />
            </TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('id')}>
              <div className="flex items-center gap-1">ID <SortIndicator column="id" /></div>
            </TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('input_date')}>
              <div className="flex items-center gap-1">Tanggal Input <SortIndicator column="input_date" /></div>
            </TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('name')}>
              <div className="flex items-center gap-1">Lead <SortIndicator column="name" /></div>
            </TableCell>
            <TableCell isHeader>Nilai (Est)</TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('sales_name')}>
              <div className="flex items-center gap-1">PIC <SortIndicator column="sales_name" /></div>
            </TableCell>
            <TableCell isHeader className="cursor-pointer text-center" onClick={() => onSort('status')}>
              <div className="flex items-center justify-center gap-1">Status <SortIndicator column="status" /></div>
            </TableCell>
            <TableCell isHeader className="text-center">Aksi</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableEmpty colSpan={7} message="Tidak ada lead yang ditemukan" />
          ) : (
            leads.map(lead => (
              <TableRow key={lead.id}>
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedIds.includes(lead.id)}
                    onChange={() => onToggleSelect(lead.id)}
                    variant="blue"
                  />
                </TableCell>
                <TableCell className="text-gray-500 font-mono">#{String(lead.id).padStart(4, '0')}</TableCell>
                <TableCell className="py-5">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={12} strokeWidth={2.5} />
                    <Label className="text-[11px] ">{lead.input_date ? new Date(lead.input_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</Label>
                  </div>
                </TableCell>
                <TableCell>
                  {lead.salutation && <span className="!text-blue-400 mr-1">{lead.salutation}</span>}
                  {lead.name}
                  <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase tracking-tight">{lead.client_company?.name || 'Perorangan'}</Subtext>
                </TableCell>
                <TableCell className=" text-gray-600">{formatIDR(lead.expected_value)}</TableCell>
                <TableCell className="py-4 w-[150px]">
                  <Label className="text-gray-700">
                    {lead.sales_profile?.full_name?.split(' ')[0] || '-'}
                  </Label>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusVariant(lead.status)}>{lead.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(lead)}
                      className="!p-2 text-blue-500 hover:bg-blue-50"
                    >
                      <TableIcon size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
                      className="!p-2 text-rose-700 !bg-transparent hover:!bg-rose-50 shadow-none hover:border-rose-200 transition-all border border-transparent rounded-lg"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
