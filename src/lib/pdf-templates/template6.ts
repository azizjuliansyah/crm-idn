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
  
  // Top Contacts Right Side Headers
  const contactY = 30; // Shifted down a bit
  const col1 = 90;
  const col2 = 150;
  const col3 = pageWidth - padX - 12;
  
  const iconY = 15;

  // 1) Email Icon & Text
  doc.setDrawColor(cyanColor);
  doc.setFillColor(cyanColor);
  // Envelope icon (approx 8x6)
  safeRect(doc, col1 + 4, iconY + 2, 8, 5, 'FD');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(col1 + 4, iconY + 2, col1 + 8, iconY + 4.5);
  doc.line(col1 + 12, iconY + 2, col1 + 8, iconY + 4.5);
  
  safeText(doc, config.company_address || 'info@idn.id\nJl. Anggrek Rosliana no 12A Slipi\nPalmerah Jakarta Barat 11480', col1 + 4, contactY);

  // Border between 1 and 2
  doc.setDrawColor('#E5E7EB');
  doc.setLineWidth(0.3);
  doc.line(col2 - 4, iconY, col2 - 4, contactY + 8);

  // 2) Phone Icon & Text
  doc.setDrawColor(cyanColor);
  doc.setFillColor(cyanColor);
  
  // OPSI 1: Modern Smartphone shape (digambar rapi manual)
  // doc.setLineWidth(0.4);
  // doc.roundedRect(col2, iconY, 5, 8, 1, 1, 'S'); // Outer phone body
  // doc.setLineWidth(0.5);
  // doc.line(col2 + 1.5, iconY + 1.5, col2 + 3.5, iconY + 1.5); // Speaker slot
  // doc.circle(col2 + 2.5, iconY + 6.5, 0.4, 'F'); // Home button

  // OPSI 2: Jika ingin pakai Base64 Icon (Hapus Opsi 1 di atas, lalu enable code di bawah)
  const phoneBase64 = "data:image/png;base64,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"; // Ganti dengan string base64 icon PNG anda
  doc.addImage(phoneBase64, 'PNG', col2, iconY + 1, 6, 6);

  safeText(doc, config.contact_phone_hours || '0819-0819-1001\nSenin - Jumat\n09.00 to 17.00 WIB', col2, contactY);

  // Border between 2 and 3
  doc.setDrawColor('#E5E7EB');
  doc.setLineWidth(0.3);
  doc.line(col3 - 8, iconY, col3 - 8, contactY + 8);

  // 3) Web Icon & Text
  // Globe icon approx
  doc.setDrawColor(cyanColor);
  doc.setLineWidth(0.3);
  doc.circle(col3, iconY + 4, 4, 'S');
  doc.line(col3, iconY, col3, iconY + 8);
  doc.line(col3 - 4, iconY + 4, col3 + 4, iconY + 4);
  doc.ellipse(col3, iconY + 4, 2, 4, 'S');

  safeText(doc, config.company_website || 'www.idn.id', col3 + 3, contactY, { align: 'center' });

  // Bottom Border separator for header
  doc.setDrawColor('#E5E7EB');
  doc.setLineWidth(0.5);
  doc.line(92, contactY + 12, pageWidth - padX, contactY + 12);

  // Left Logo Placeholder
  const logoUrl = config.logo_url || company.logo_url;
  if (logoUrl) {
      try {
        const { width, height, element } = await getImgDimensions(logoUrl);
        const maxW = 50; const maxH = 20;
        const ratio = Math.min(maxW / width, maxH / height);
          doc.addImage(element, 'PNG', padX, 20, width * ratio, height * ratio, undefined, 'FAST');
        } catch(e) { 
          doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0); safeText(doc, 'ID-Networkers', padX, 30); 
          doc.setFontSize(8); doc.setFont('helvetica', 'normal'); safeText(doc, 'Indonesian IT Expert Factory', padX, 34);
        }
  } else {
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0); safeText(doc, 'ID-Networkers', padX, 30);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); safeText(doc, 'Indonesian IT Expert Factory', padX, 34);
  }

  // Title
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#BDC3C7');
  
  let labelTitle = 'PENAWARAN';
  if ((config as any).document_type === 'invoice') labelTitle = 'INVOICE';
  if ((config as any).document_type === 'proforma') labelTitle = 'PROFORMA INVOICE';
  if ((config as any).document_type === 'kwitansi') labelTitle = 'KWITANSI';
  
  safeText(doc, labelTitle, pageWidth - padX, 60, { align: 'right' });

  // Client Info
  doc.setDrawColor(cyanColor);
  doc.setFillColor('#E5F7F9');
  
  doc.setFontSize(10);
  doc.setTextColor(textGray);
  doc.setFont('helvetica', 'bold');
  
  // Align "Kepada Yth:" label precisely with the Document Title (y = 60)
  const clientStartY = 55;
  safeText(doc, 'Kepada Yth:', padX, clientStartY);
  
  doc.setTextColor(textGray);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  safeText(doc, qData.client?.client_company?.name || 'PERORANGAN', padX, clientStartY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Baris UP
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'UP: ', padX, clientStartY + 14);
  let labelW = (doc.getStringUnitWidth('UP: ') * doc.getFontSize()) / doc.internal.scaleFactor;
  doc.setFont('helvetica', 'normal');
  safeText(doc, `${qData.client?.salutation || ''} ${qData.client?.name || ''}`.trim(), padX + labelW, clientStartY + 14);
  
  // Baris Address
  safeText(doc, String(qData.client?.address || ''), padX, clientStartY + 19, { maxWidth: 80 });

  // Baris Phone
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'Phone: ', padX, clientStartY + 29);
  labelW = (doc.getStringUnitWidth('Phone: ') * doc.getFontSize()) / doc.internal.scaleFactor;
  doc.setFont('helvetica', 'normal');
  safeText(doc, String(qData.client?.whatsapp || ''), padX + labelW, clientStartY + 29);
  
  // Baris Email
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'Email: ', padX, clientStartY + 34);
  labelW = (doc.getStringUnitWidth('Email: ') * doc.getFontSize()) / doc.internal.scaleFactor;
  doc.setFont('helvetica', 'normal');
  safeText(doc, String(qData.client?.email || ''), padX + labelW, clientStartY + 34);

  // Cyan Banner Background
  const bannerY = 85;
  const bannerW = 110 + padX; // Extend width to cover the right margin
  doc.setFillColor(cyanColor);
  safeRect(doc, pageWidth - bannerW, bannerY, bannerW, 16, 'F');
  
  doc.setDrawColor('#BDC3C7');
  // Total, Document Number, Date Circles
  const c1X = pageWidth - 95 - padX;
  const c2X = pageWidth - 55 - padX;
  const c3X = pageWidth - 15 - padX;
  
  // Create outer outlined circles higher up above the banner
  const circleY = bannerY - 11; 
  const circleRadius = 10;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor('#BDC3C7');
  doc.setLineWidth(0.4);
  
  // Total Circle
  doc.circle(c1X, circleY, circleRadius, 'FD');
  // No Circle
  doc.circle(c2X, circleY, circleRadius, 'FD');
  // Date Circle
  doc.circle(c3X, circleY, circleRadius, 'FD');
  
  // Inner Cyan Icons (Text representations)
  doc.setTextColor(cyanColor);
  
  // 1: "Rp" text
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'Rp', c1X, circleY + 2, { align: 'center' });
  
  // 2: Barcode Mockup
  doc.setFillColor(cyanColor);
  const bcW = 11;
  const bcH = 6;
  const bcX = c2X - (bcW / 2);
  const bcY = circleY - (bcH / 2);
  // draw varying width rectangles
  safeRect(doc, bcX, bcY, 1, bcH, 'F');
  safeRect(doc, bcX + 1.5, bcY, 0.5, bcH, 'F');
  safeRect(doc, bcX + 2.5, bcY, 1.5, bcH, 'F');
  safeRect(doc, bcX + 4.5, bcY, 0.5, bcH, 'F');
  safeRect(doc, bcX + 5.5, bcY, 1, bcH, 'F');
  safeRect(doc, bcX + 7, bcY, 1, bcH, 'F');
  safeRect(doc, bcX + 8.5, bcY, 0.5, bcH, 'F');
  safeRect(doc, bcX + 9.5, bcY, 1.5, bcH, 'F');

  // 3: Calendar Mockup
  doc.setDrawColor(cyanColor);
  doc.setLineWidth(0.4);
  const calW = 9;
  const calH = 7;
  const calX = c3X - (calW / 2);
  const calY = circleY - (calH / 2);
  // outline
  safeRect(doc, calX, calY, calW, calH, 'S');
  // top header bar
  safeRect(doc, calX, calY, calW, 2, 'FD');
  doc.setFillColor(cyanColor);
  // calendar binding rings
  safeRect(doc, calX + 2, calY - 1, 1, 2, 'F');
  safeRect(doc, calX + 7, calY - 1, 1, 2, 'F');
  // calendar grid dots
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      safeRect(doc, calX + 1.1 + (c * 2), calY + 2.5 + (r * 1.5), 0.8, 0.8, 'F');
    }
  }
  
  // Enlarge pointers down into banner
  doc.setFillColor(255, 255, 255);
  // Triangle points: top-left, top-right, bottom-center
  const tW = 14; // Triangle Base width
  const tH = 6;  // Triangle Height
  doc.triangle(c1X - (tW / 2), bannerY - 0.5, c1X + (tW / 2), bannerY - 0.5, c1X, bannerY + tH, 'F');
  doc.triangle(c2X - (tW / 2), bannerY - 0.5, c2X + (tW / 2), bannerY - 0.5, c2X, bannerY + tH, 'F');
  doc.triangle(c3X - (tW / 2), bannerY - 0.5, c3X + (tW / 2), bannerY - 0.5, c3X, bannerY + tH, 'F');
  
  // Labels inside Cyan Banner
  const labelY = bannerY + 11;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  safeText(doc, 'Total:', c1X, bannerY + 10, { align: 'center' });
  safeText(doc, 'No. Dokumen:', c2X, bannerY + 10, { align: 'center' });
  
  let dateTitle = 'Berlaku s.d.';
  let printDate = qData.expiry_date;
  if ((config as any).document_type === 'invoice' || (config as any).document_type === 'proforma' || (config as any).document_type === 'kwitansi') {
    dateTitle = 'Due Date:';
    printDate = qData.due_date;
  }
  
  safeText(doc, dateTitle, c3X, bannerY + 10, { align: 'center' });

  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  safeText(doc, formatIDR(qData.total), c1X, bannerY + 14, { align: 'center' });
  safeText(doc, qData.number, c2X, bannerY + 14, { align: 'center' });
  safeText(doc, formatDateString(printDate), c3X, bannerY + 14, { align: 'center' });

  // Table Header separation line
  doc.setDrawColor('#E5E7EB');
  doc.setLineWidth(0.5);
  doc.line(padX, 110, pageWidth - padX, 110);
  doc.line(padX, 118, pageWidth - padX, 118);

  // Footer helper
  const renderFooter = (pageDoc: jsPDF) => {
    const docHeight = pageDoc.internal.pageSize.getHeight();
    pageDoc.setFillColor('#A3A3A3');
    safeRect(pageDoc, 0, docHeight - 14, pageWidth, 7, 'F');
    pageDoc.setTextColor(255, 255, 255);
    pageDoc.setFontSize(8); pageDoc.setFont('helvetica', 'bold');
    safeText(pageDoc, config.footer_bar_text || 'Thank you for your business', pageWidth / 2, docHeight - 9.5, { align: 'center' });
    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7);
    pageDoc.setTextColor(textGray);
    safeText(pageDoc, config.footer_text || 'PT Integrasi Data Nusantara | www.idn.id | info@idn.id | 0819-0819-1001', pageWidth / 2, docHeight - 3, { align: 'center' });
  };

  const items = qData.quotation_items || qData.proforma_items || qData.invoice_items || qData.kwitansi_items || [];

  // Reserved space calculation for totals + notes + signature
  // Subtotal (6) + Tax (6) + Total (8) + Payment (20) + Notes (30) + Signature (40) + Safety (10)
  const signatureHeight = 120; 
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerSpace = 30;

  const tableBody = items.map((it: any) => [
    `${it.products?.name || ''}\n${it.description || ''}`, 
    formatIDR(it.price), 
    `${it.qty} ${it.unit_name || ''}`, 
    formatIDR(it.total)
  ]);

  const commonOptions: any = {
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
    margin: { left: padX, right: padX, bottom: 30 },
    didDrawPage: () => renderFooter(doc),
    willDrawCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell._text = data.cell.text; 
        data.cell.text = [];
      }
    },
    didDrawCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 0) {
        const lines = data.cell._text || data.cell.text;
        if (lines && Array.isArray(lines) && lines.length > 0) {
          const productName = String(lines[0] || '');
          const descriptionLines = lines.slice(1);
          let currY = data.cell.y + 5;
          const sX = data.cell.x + 2;
          if (productName) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(textGray);
            safeText(doc, productName, sX, currY);
          }
          if (descriptionLines.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#9CA3AF');
            doc.setFontSize(9);
            currY += 4;
            const descText = descriptionLines.join('\n');
            if (descText.trim()) safeText(doc, descText, sX, currY);
          }
        }
      }
    }
  };

  let currentY = 110;
  if (items.length > 1) {
    autoTable(doc, {
      ...commonOptions,
      startY: 110,
      head: [['Keterangan', 'Harga', 'Jumlah', 'Total']],
      body: tableBody.slice(0, -1),
      willDrawCell: (data: any) => {
        if (data.section === 'body' && data.row.index % 2 === 0) {
          doc.setFillColor('#E2E8F0');
          safeRect(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        }
        commonOptions.willDrawCell(data);
      }
    });
    currentY = (doc as any).lastAutoTable.finalY;
  }

  // Check if last row + signature fits
  const lastRow = tableBody.slice(-1);
  const estRowHeight = 15; 
  const spaceNeeded = estRowHeight + signatureHeight;
  
  const shouldMoveToNextPage = (currentY + spaceNeeded > pageHeight - footerSpace);

  if (shouldMoveToNextPage) {
    doc.addPage();
    renderFooter(doc);
    currentY = 20;
  }

  autoTable(doc, {
    ...commonOptions,
    startY: currentY,
    // Show header only if it moved to a new page or it's the only item
    head: (shouldMoveToNextPage || items.length === 1) ? [['Keterangan', 'Harga', 'Jumlah', 'Total']] : [],
    body: lastRow,
    willDrawCell: (data: any) => {
      // For the last row, the global index is always items.length - 1
      const globalIndex = items.length - 1;
      if (data.section === 'body' && globalIndex % 2 === 0) {
        doc.setFillColor('#E2E8F0');
        safeRect(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
      }
      commonOptions.willDrawCell(data);
    }
  });

  const finalY = safeNum((doc as any).lastAutoTable?.finalY, 150);
  
  doc.setFillColor('#A3A3A3');
  safeRect(doc, 0, finalY + 5, (pageWidth / 2) + padX, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  safeText(doc, `${dateTitle} `, padX + 5, finalY + 10);
  
  const dateTitleWidth = (doc.getStringUnitWidth(`${dateTitle} `) * doc.getFontSize()) / doc.internal.scaleFactor;
  doc.setFont('helvetica', 'bold');
  safeText(doc, formatDateString(printDate), padX + 5 + dateTitleWidth, finalY + 10);

  const rightLabelX = pageWidth - 60 - padX;
  doc.setTextColor(textGray);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  safeText(doc, 'Sub Total', rightLabelX, finalY + 10);
  safeText(doc, formatIDR(qData.subtotal), pageWidth - padX, finalY + 10, { align: 'right' });
  
  currentY = finalY + 16;

  if (qData.discount_value > 0) {
    currentY += 6;
    safeText(doc, 'Diskon', rightLabelX, currentY);
    safeText(doc, `-${formatIDR(qData.discount_value)}`, pageWidth - padX, currentY, { align: 'right' });
  }

  currentY += 6;
  const taxLabel = qData.tax_value > 0 ? (qData.tax_type || 'PPN') : 'Non Pajak';
  safeText(doc, taxLabel, rightLabelX, currentY);
  safeText(doc, formatIDR(qData.tax_value || 0), pageWidth - padX, currentY, { align: 'right' });

  const grandTotalY = currentY + 3;
  doc.setFillColor(cyanColor);
  safeRect(doc, pageWidth / 2 + padX, grandTotalY, pageWidth / 2 - padX, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'Total', rightLabelX, grandTotalY + 5.5);
  safeText(doc, formatIDR(qData.total), pageWidth - padX - 5, grandTotalY + 5.5, { align: 'right' });

  const notesY = grandTotalY + 15;
  doc.setTextColor(textGray);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  safeText(doc, 'Payment via Bank Transfer:', padX, notesY);
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.payment_info || '- BCA 5435033030 an PT Integrasi Data Nusantara', padX, notesY + 5, { maxWidth: pageWidth / 2 + 10 });
  
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(textGray);
  safeText(doc, 'Mohon kirimkan bukti pembayaran ke: ', padX, notesY + 15);
  labelW = (doc.getStringUnitWidth('Mohon kirimkan bukti pembayaran ke: ') * doc.getFontSize()) / doc.internal.scaleFactor;
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.finance_email || 'finance@idn.id', padX + labelW, notesY + 15);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  safeText(doc, 'Catatan:', padX, notesY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  safeText(doc, config.note_footer || '- Info jadwal training yang tersedia, silakan cek di www.jadwal.idn.id\n- Pendaftaran training akan diproses setelah pembayaran kami terima\n- Maksimal pembayaran H-4 dari tanggal pelaksanaan training.\n- Harap konfirmasi ke admin terlebih dahulu...\n- Jika sudah fix dan ingin keep jadwal...', padX, notesY + 28, { maxWidth: pageWidth / 2 + 10 });

  const sigY = notesY + 30;
  if (config.signature_url) {
      try {
        const { width, height, element } = await getImgDimensions(config.signature_url);
        const maxW = 50; const maxH = 20;
        const ratio = Math.min(maxW / width, maxH / height);
        doc.addImage(element, 'PNG', rightLabelX - 10, sigY, width * ratio, height * ratio, undefined, 'FAST');
      } catch(e) { }
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText(doc, config.signature_name || 'Reftika Diansa', rightLabelX + 15, sigY + 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.signature_title || 'Sales Administrative Assistant', rightLabelX + 15, sigY + 29, { align: 'center' });

  // Ensure footer is rendered on the last page if final content pushed it out
  renderFooter(doc);

  // Add Page Numbers (Page X of Y) in top right corner
  const pageCount = (doc.internal as any).pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(textGray);
    doc.setFont('helvetica', 'normal');
    const pageText = `Halaman ${i} dari ${pageCount}`;
    safeText(doc, pageText, pageWidth - padX, 10, { align: 'right' });
  }
};
