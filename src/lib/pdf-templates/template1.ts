import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Company } from '@/lib/types';
import { safeRect, safeText, formatIDR, formatDateString, safeNum, getImgDimensions } from './utils';

export const generateTemplate1 = async (
  doc: jsPDF,
  qData: any,
  config: any,
  company: Company,
  pageWidth: number,
  padX: number
) => {
  const primaryColor = '#4F46E5'; // Indigo

  // Header Background
  doc.setFillColor(primaryColor); 
  safeRect(doc, 0, 0, pageWidth, 40, 'F');
  
  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  
  let labelTitle = 'PENAWARAN';
  if ((config as any).document_type === 'invoice') {
    labelTitle = 'INVOICE';
  } else if ((config as any).document_type === 'proforma') {
    labelTitle = 'PROFORMA INVOICE';
  } else if ((config as any).document_type === 'kwitansi') {
    labelTitle = 'KWITANSI';
  }
  safeText(doc, labelTitle, padX, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let dateTitle = 'Berlaku s.d.';
  let printDate = qData.expiry_date;
  let docNoLabel = 'No. Penawaran';
  if ((config as any).document_type === 'invoice') {
    dateTitle = 'Jatuh Tempo';
    printDate = qData.due_date;
    docNoLabel = 'No. Invoice';
  } else if ((config as any).document_type === 'proforma') {
    dateTitle = 'Jatuh Tempo';
    printDate = qData.due_date;
    docNoLabel = 'No. Proforma';
  } else if ((config as any).document_type === 'kwitansi') {
    dateTitle = 'Tanggal';
    printDate = qData.date;
    docNoLabel = 'No. Kwitansi';
  }
  safeText(doc, `${dateTitle}: ${formatDateString(printDate)}`, pageWidth - padX, 25, { align: 'right' });

  // Company and Client Info Section
  const clientInfoY = 50;
  let compY = 50;
  
  // Left side: Company Info
  doc.setTextColor(17, 17, 17);
  const logoUrl = config.logo_url || company.logo_url;
  if (logoUrl) {
    try {
      const { width, height, element } = await getImgDimensions(logoUrl);
      const maxWidth = 50; const maxHeight = 20;
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      const scaledH = height * ratio;
      doc.addImage(element, 'PNG', padX, compY, width * ratio, scaledH, undefined, 'FAST');
      compY += scaledH + 8;
    } catch(e) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      safeText(doc, company.name, padX, compY + 5);
      compY += 12;
    }
  } else {
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    safeText(doc, company.name, padX, compY + 5);
    compY += 12;
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.company_address || '', padX, compY, { maxWidth: pageWidth / 2 - 30 });
  if (config.finance_email) {
    safeText(doc, `Email: ${config.finance_email}`, padX, compY + 15);
  }
  if (config.top_contact) {
    safeText(doc, `Contact: ${config.top_contact}`, padX, compY + 20);
  }
  if (config.company_website) {
    safeText(doc, `Website: ${config.company_website}`, padX, compY + 25);
  }

  // Right side: Client Info
  const rightX = pageWidth / 2 + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'Kepada Yth:', rightX, clientInfoY);
  doc.setFontSize(11);
  safeText(doc, qData.client?.client_company?.name || 'PERORANGAN', rightX, clientInfoY + 6);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  safeText(doc, `UP: ${qData.client?.salutation || ''} ${qData.client?.name || ''}`.trim(), rightX, clientInfoY + 11);
  safeText(doc, String(qData.client?.address || ''), rightX, clientInfoY + 16, { maxWidth: 80 });
  safeText(doc, `Phone: ${String(qData.client?.whatsapp || '')}`, rightX, clientInfoY + 26);
  safeText(doc, `Email: ${String(qData.client?.email || '')}`, rightX, clientInfoY + 31);

  // Document Meta Data (Number & Date)
  const metaY = Math.max(compY + 35, clientInfoY + 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText(doc, `${docNoLabel}:`, padX, metaY);
  doc.setFont('helvetica', 'normal');
  safeText(doc, qData.number, padX + 25, metaY);
  
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'Tanggal:', rightX, metaY);
  doc.setFont('helvetica', 'normal');
  safeText(doc, formatDateString(qData.date), rightX + 17, metaY);

  const items = qData.quotation_items || qData.proforma_items || qData.invoice_items || qData.kwitansi_items || [];

  autoTable(doc, {
    startY: metaY + 5,
    head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
    body: items.map((it: any) => [
      String(it.products?.name || ''), 
      String(it.description || ''), 
      `${it.qty} ${it.unit_name || ''}`, 
      formatIDR(it.price), 
      formatIDR(it.total)
    ]),
    theme: 'striped',
    headStyles: { fillColor: primaryColor }
  });

  const finalY = safeNum((doc as any).lastAutoTable?.finalY, 150);
  let currentY = finalY + 10;
  const labelX = pageWidth - 60;
  const valueX = pageWidth - padX;

  doc.setTextColor(17, 17, 17);
  doc.setFontSize(10);
  safeText(doc, 'Sub Total', labelX, currentY);
  safeText(doc, formatIDR(qData.subtotal), valueX, currentY, { align: 'right' });

  if (qData.discount_value > 0) {
    currentY += 6;
    safeText(doc, 'Diskon', labelX, currentY);
    safeText(doc, `-${formatIDR(qData.discount_value)}`, valueX, currentY, { align: 'right' });
  }

  currentY += 6;
  const taxLabel = qData.tax_value > 0 ? (qData.tax_type || 'PPN') : 'Non Pajak';
  safeText(doc, taxLabel, labelX, currentY);
  safeText(doc, formatIDR(qData.tax_value || 0), valueX, currentY, { align: 'right' });

  currentY += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'Total', labelX, currentY);
  safeText(doc, formatIDR(qData.total), valueX, currentY, { align: 'right' });

  // Notes and Payment Info
  const notesY = currentY + 15;
  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  safeText(doc, 'Payment via Bank Transfer:', padX, notesY);
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.payment_info || '- BCA 5435033030 an PT Integrasi Data Nusantara', padX, notesY + 5, { maxWidth: pageWidth / 2 + 10 });
  
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  safeText(doc, 'Mohon kirimkan bukti pembayaran ke: ', padX, notesY + 15);
  const infoLabelW = (doc.getStringUnitWidth('Mohon kirimkan bukti pembayaran ke: ') * doc.getFontSize()) / doc.internal.scaleFactor;
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.finance_email || 'finance@idn.id', padX + infoLabelW, notesY + 15);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  safeText(doc, 'Catatan:', padX, notesY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  safeText(doc, config.note_footer || '- Info jadwal training yang tersedia, silakan cek di www.jadwal.idn.id\n- Pendaftaran training akan diproses setelah pembayaran kami terima\n- Maksimal pembayaran H-4 dari tanggal pelaksanaan training.', padX, notesY + 28, { maxWidth: pageWidth / 2 + 10 });

  const sigY = notesY + 30;
  if (config.signature_url) {
      try {
        const { width, height, element } = await getImgDimensions(config.signature_url);
        const maxW = 50; const maxH = 20;
        const ratio = Math.min(maxW / width, maxH / height);
        doc.addImage(element, 'PNG', pageWidth - padX - 65, sigY, width * ratio, height * ratio, undefined, 'FAST');
      } catch(e) { }
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText(doc, config.signature_name || 'Reftika Diansa', pageWidth - padX - 40, sigY + 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.signature_title || 'Sales Administrative Assistant', pageWidth - padX - 40, sigY + 29, { align: 'center' });

  const docHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor('#4F46E5');
  safeRect(doc, 0, docHeight - 14, pageWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  safeText(doc, config.footer_bar_text || 'Thank you for your business', pageWidth / 2, docHeight - 9.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(17, 17, 17);
  safeText(doc, config.footer_text || 'PT Integrasi Data Nusantara | www.idn.id | info@idn.id | 0819-0819-1001', pageWidth / 2, docHeight - 3, { align: 'center' });

  // Add Page Numbers (Page X of Y) in top right corner
  const pageCount = (doc.internal as any).pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(17, 17, 17);
    doc.setFont('helvetica', 'normal');
    const pageText = `Page ${i} of ${pageCount}`;
    safeText(doc, pageText, pageWidth - padX, 10, { align: 'right' });
  }
};
