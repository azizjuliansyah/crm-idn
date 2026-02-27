import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Company } from '@/lib/types';
import { safeRect, safeText, formatIDR } from './utils';

export const generateTemplate1 = async (
  doc: jsPDF,
  qData: any,
  config: any,
  company: Company,
  pageWidth: number,
  padX: number
) => {
  doc.setFillColor('#4F46E5'); 
  safeRect(doc, 0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'SAMPLE PREVIEW', 20, 25);
  autoTable(doc, {
    startY: 50,
    head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
    body: qData.quotation_items.map((it: any) => [
      String(it.products.name), 
      String(it.description), 
      `${it.qty} ${it.unit_name}`, 
      formatIDR(it.price), 
      formatIDR(it.total)
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#4F46E5' }
  });
};
