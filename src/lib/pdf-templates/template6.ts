import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Company } from '@/lib/types';
import { safeRect, safeText, formatIDR, formatDateString, safeNum, getImgDimensions } from './utils';

export const generateTemplate6 = async (
  doc: jsPDF,
  qData: any,
  config: any,
  company: Company,
  pageWidth: number,
  padX: number
) => {
  const cyanColor = '#7BD3DE';
  const textGray = '#666666';

  doc.setFontSize(9);
  doc.setTextColor(textGray);
  
  // Top Contacts Left
  const contactY = 15;
  const col2 = 120;
  safeText(doc, 'info@idn.id\nJl. Anggrek Rosliana no 12A Slipi\nPalmerah Jakarta Barat 11480', col2, contactY);
  const col3 = 160;
  safeText(doc, '0819-0819-1001\nSenin - Jumat\n09.00 to 17.00 WIB', col3, contactY);
  const col4 = pageWidth - padX;
  safeText(doc, 'www.idn.id', col4, contactY, { align: 'right' });

  // Left Logo Placeholder
  const logoUrl = config.logo_url || company.logo_url;
  if (logoUrl) {
      try {
        const { width, height, element } = await getImgDimensions(logoUrl);
        const maxW = 50; const maxH = 20;
        const ratio = Math.min(maxW / width, maxH / height);
        doc.addImage(element, 'PNG', padX, 10, width * ratio, height * ratio, undefined, 'FAST');
      } catch(e) { 
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0); safeText(doc, 'ID-Networkers', padX, 20); 
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); safeText(doc, 'Indonesian IT Expert Factory', padX, 24);
      }
  } else {
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0); safeText(doc, 'ID-Networkers', padX, 20);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); safeText(doc, 'Indonesian IT Expert Factory', padX, 24);
  }

  // Title
  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#BDC3C7');
  safeText(doc, 'PENAWARAN', col2, 45);

  // Client Info
  doc.setDrawColor(cyanColor);
  doc.setFillColor('#E5F7F9');
  safeRect(doc, padX, 41, 6, 8, 'FD'); // Simulate icon box
  
  doc.setFontSize(10);
  doc.setTextColor(textGray);
  doc.setFont('helvetica', 'normal');
  safeText(doc, 'Kepada Yth:', padX + 10, 47);
  
  doc.setTextColor(textGray);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  safeText(doc, qData.client.client_company.name, padX, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  safeText(doc, `UP: ${qData.client.salutation} ${qData.client.name}`, padX, 61);
  safeText(doc, String(qData.client.address || ''), padX, 66, { maxWidth: 80 });
  safeText(doc, `Phone: ${String(qData.client.whatsapp || '')}`, padX, 76);
  safeText(doc, `Email: ${String(qData.client.email || '')}`, padX, 81);

  // Cyan Banner Background
  const bannerY = 65;
  const bannerW = 110;
  doc.setFillColor(cyanColor);
  safeRect(doc, pageWidth - bannerW, bannerY, bannerW, 16, 'F');
  
  doc.setDrawColor('#BDC3C7');
  doc.setLineWidth(0.5);
  
  const c1X = pageWidth - 95;
  const c2X = pageWidth - 55;
  const c3X = pageWidth - 15;
  
  doc.setFillColor(255, 255, 255);
  doc.circle(c1X, bannerY, 8, 'FD');
  doc.circle(c2X, bannerY, 8, 'FD');
  doc.circle(c3X, bannerY, 8, 'FD');

  doc.setTextColor(cyanColor);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  safeText(doc, 'Rp', c1X, bannerY + 1.5, { align: 'center' });
  doc.setFontSize(6);
  safeText(doc, '||| | ||', c2X, bannerY + 1, { align: 'center' });
  doc.setFontSize(10);
  safeText(doc, 'O', c3X, bannerY + 1.5, { align: 'center' });

  doc.setFillColor(255,255,255);
  doc.triangle(c1X - 3, bannerY + 8, c1X + 3, bannerY + 8, c1X, bannerY + 11, 'F');
  doc.triangle(c2X - 3, bannerY + 8, c2X + 3, bannerY + 8, c2X, bannerY + 11, 'F');
  doc.triangle(c3X - 3, bannerY + 8, c3X + 3, bannerY + 8, c3X, bannerY + 11, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  safeText(doc, 'Total:', c1X - 10, bannerY + 10);
  safeText(doc, 'No. #:', c2X - 10, bannerY + 10);
  safeText(doc, 'Tanggal:', c3X - 10, bannerY + 10);

  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  safeText(doc, formatIDR(qData.total), c1X - 10, bannerY + 14);
  safeText(doc, qData.number, c2X - 10, bannerY + 14);
  safeText(doc, formatDateString(qData.date), c3X - 10, bannerY + 14);

  // Table Header separation line
  doc.setDrawColor('#E5E7EB');
  doc.setLineWidth(0.5);
  doc.line(padX, 90, pageWidth - padX, 90);
  doc.line(padX, 98, pageWidth - padX, 98);

  autoTable(doc, {
    startY: 90,
    head: [['Keterangan', 'Harga', 'Jumlah', 'Total']],
    body: qData.quotation_items.map((it: any) => [
      `${it.products.name}\n${it.description}`, 
      formatIDR(it.price), 
      `${it.qty} ${it.unit_name}`, 
      formatIDR(it.total)
    ]),
    theme: 'plain',
    headStyles: { 
      textColor: cyanColor, 
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
      cellPadding: { top: 3, bottom: 3 }
    },
    bodyStyles: { 
      textColor: textGray,
      fontSize: 10,
      valign: 'middle',
      halign: 'left'
    },
    columnStyles: { 
      0: { cellWidth: 105, halign: 'left' }, 
      1: { cellWidth: 35, halign: 'left' }, 
      2: { cellWidth: 20, halign: 'left' }, 
      3: { cellWidth: 35, halign: 'left' } 
    },
    margin: { left: padX, right: padX },
    tableWidth: 'auto',
    willDrawCell: function(data) {
      if (data.section === 'body' && data.row.index % 2 === 0) {
          doc.setFillColor('#E2E8F0');
          safeRect(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const lines = data.cell.text;
        if (lines && Array.isArray(lines) && lines.length > 0) {
          const productName = String(lines[0] || '');
          const descriptionLines = lines.slice(1);
          
          let currentY = data.cell.y + 5;
          const startX = data.cell.x + 2;
          
          if (productName) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(textGray);
            safeText(doc, productName, startX, currentY);
          }
          
          if (descriptionLines.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#9CA3AF');
            doc.setFontSize(9);
            currentY += 4;
            const descText = descriptionLines.join('\n');
            if (descText.trim()) {
              safeText(doc, descText, startX, currentY);
            }
          }
        }
      }
    }
  });

  const finalY = safeNum((doc as any).lastAutoTable?.finalY, 150);
  
  doc.setFillColor('#A3A3A3');
  safeRect(doc, 0, finalY + 5, pageWidth / 2 + 5, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  safeText(doc, `Penawaran berlaku s.d. `, padX, finalY + 10);
  doc.setFont('helvetica', 'bold');
  safeText(doc, formatDateString(qData.expiry_date), padX + 35, finalY + 10);

  const rightLabelX = pageWidth - 60;
  doc.setTextColor(textGray);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  safeText(doc, 'Sub Total', rightLabelX, finalY + 10);
  safeText(doc, formatIDR(qData.subtotal), pageWidth - padX, finalY + 10, { align: 'right' });
  
  safeText(doc, 'PPN 11%', rightLabelX, finalY + 16);
  safeText(doc, formatIDR(qData.tax_value), pageWidth - padX, finalY + 16, { align: 'right' });

  doc.setFillColor(cyanColor);
  safeRect(doc, pageWidth / 2 + 5, finalY + 19, pageWidth / 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'Total', rightLabelX, finalY + 24.5);
  safeText(doc, formatIDR(qData.total), pageWidth - padX, finalY + 24.5, { align: 'right' });

  const notesY = finalY + 25;
  doc.setTextColor(textGray);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  safeText(doc, 'Payment via Bank Transfer:', padX, notesY);
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.payment_info || '- BCA 5435033030 an PT Integrasi Data Nusantara', padX, notesY + 5, { maxWidth: pageWidth / 2 + 10 });
  
  doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(textGray);
  safeText(doc, 'Mohon kirimkan bukti pembayaran ke finance@idn.id', padX, notesY + 15);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  safeText(doc, 'Catatan:', padX, notesY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  safeText(doc, config.note_footer || '- Info jadwal training yang tersedia, silakan cek di www.jadwal.idn.id\n- Pendaftaran training akan diproses setelah pembayaran kami terima\n- Maksimal pembayaran H-4 dari tanggal pelaksanaan training.\n- Harap konfirmasi ke admin terlebih dahulu...\n- Jika sudah fix dan ingin keep jadwal...', padX, notesY + 28, { maxWidth: pageWidth / 2 + 10 });

  const sigY = notesY + 30;
  if (config.signature_url) {
      try {
        doc.addImage(config.signature_url, 'PNG', rightLabelX, sigY, 35, 20, undefined, 'FAST');
      } catch(e) { }
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText(doc, config.signature_name || 'Reftika Diansa', rightLabelX + 15, sigY + 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.signature_title || 'Sales Administrative Assistant', rightLabelX + 15, sigY + 29, { align: 'center' });

  const docHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor('#A3A3A3');
  safeRect(doc, 0, docHeight - 10, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  safeText(doc, config.footer_bar_text || 'Thank you for your bussiness', pageWidth / 2, docHeight - 6.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  safeText(doc, config.footer_text || 'PT Integrasi Data Nusantara | www.idn.id | info@idn.id | 0819-0819-1001', pageWidth / 2, docHeight - 3.5, { align: 'center' });
};
