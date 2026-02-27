import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Company } from '@/lib/types';
import { safeRect, safeText, formatIDR, formatDateString, safeNum, getImgDimensions } from './utils';

export const generateTemplate5 = async (
  doc: jsPDF,
  qData: any,
  config: any,
  company: Company,
  pageWidth: number,
  padX: number
) => {
  const tealColor = '#55C7C7';
  const gray2Color = '#9B9B9B';
  const rowTealColor = '#2596BE'; // Ganjil
  const rowLightColor = '#F2F9FB'; // Genap

  doc.setFontSize(8.5);
  doc.setTextColor(17, 17, 17);
  safeText(doc, config.top_contact || '', pageWidth - padX, 10, { align: 'right' });
  
  const bannerHeight = 22;
  const bannerY = 18;
  const logoUrl = config.logo_url || company.logo_url;
  
  if (logoUrl) { 
    try { 
      const { width, height, element } = await getImgDimensions(logoUrl);
      const maxWidth = 60;
      const maxHeight = bannerHeight;
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      const finalWidth = width * ratio;
      const finalHeight = height * ratio;
      
      doc.addImage(element, 'PNG', safeNum(padX), safeNum(bannerY + (maxHeight - finalHeight) / 2), finalWidth, finalHeight, undefined, 'FAST'); 
    } catch (e) { 
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); safeText(doc, company.name, padX, bannerY + 12); 
    } 
  } else { 
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); safeText(doc, company.name, padX, bannerY + 12); 
  }

  doc.setFillColor(tealColor);
  safeRect(doc, pageWidth - 110, bannerY, 110, bannerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(38);
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'PENAWARAN', pageWidth - 100, bannerY + 15);
  
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  safeText(doc, 'INVOICE TO:', padX, 55);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  safeText(doc, qData.client.client_company.name, padX, 62);
  doc.setFontSize(10);
  safeText(doc, `${qData.client.salutation} ${qData.client.name}`, padX, 68);
  safeText(doc, `P: ${String(qData.client.whatsapp)}`, padX, 74);
  safeText(doc, `E: ${String(qData.client.email)}`, padX, 79);
  
  const metaX = 130;
  safeText(doc, 'QUOTATION NO', metaX, 55);
  safeText(doc, ':', metaX + 30, 55);
  safeText(doc, qData.number, metaX + 35, 55);
  safeText(doc, 'DATE', metaX, 61);
  safeText(doc, ':', metaX + 30, 61);
  safeText(doc, formatDateString(qData.date), metaX + 35, 61);
  safeText(doc, 'DUE DATE', metaX, 67);
  safeText(doc, ':', metaX + 30, 67);
  doc.setFont('helvetica', 'bold');
  safeText(doc, formatDateString(qData.expiry_date), metaX + 35, 67);
  
  autoTable(doc, {
    startY: 95,
    head: [['Item / Description', 'Price', 'Qty', 'Total']],
    body: qData.quotation_items.map((it: any) => [
      `${it.products.name}\n${it.description}`, 
      formatIDR(it.price), 
      `${it.qty} ${it.unit_name}`, 
      formatIDR(it.total)
    ]),
    theme: 'plain',
    headStyles: { 
      fillColor: tealColor, 
      textColor: '#FFFFFF', 
      minCellHeight: 12, 
      valign: 'middle', 
      fontSize: 11,
      halign: 'left'
    },
    bodyStyles: { 
      fillColor: rowLightColor, 
      minCellHeight: 14, 
      valign: 'middle',
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: rowTealColor,
      textColor: '#FFFFFF'
    },
    columnStyles: { 
      0: { cellWidth: 100, halign: 'left', cellPadding: { left: padX, top: 4, right: 4, bottom: 4 } }, 
      1: { cellWidth: 40, halign: 'left', cellPadding: { left: 4, top: 4, right: 4, bottom: 4 } }, 
      2: { cellWidth: 25, halign: 'left', cellPadding: { left: 4, top: 4, right: 4, bottom: 4 } }, 
      3: { cellWidth: 45, halign: 'left', cellPadding: { left: 4, top: 4, right: padX, bottom: 4 } } 
    },
    margin: { left: 0, right: 0 },
    tableWidth: pageWidth,
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const lines = data.cell.text;
        if (lines && Array.isArray(lines) && lines.length > 0) {
          const productName = String(lines[0] || '');
          const descriptionLines = lines.slice(1);
          
          doc.setFillColor(data.cell.styles.fillColor as string);
          safeRect(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          
          let padL = 0;
          let padT = 0;
          if (data.cell.styles.cellPadding) {
            if (typeof data.cell.styles.cellPadding === 'object') {
              padL = safeNum((data.cell.styles.cellPadding as any).left, 0);
              padT = safeNum((data.cell.styles.cellPadding as any).top, 0);
            } else {
              padL = safeNum(data.cell.styles.cellPadding, 0);
              padT = safeNum(data.cell.styles.cellPadding, 0);
            }
          }

          const startX = data.cell.x + padL;
          let currentY = data.cell.y + padT + 4;
          
          if (productName) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(data.cell.styles.textColor as string);
            doc.setFontSize(10);
            safeText(doc, productName, startX, currentY);
          }
          
          if (descriptionLines.length > 0) {
            doc.setFont('helvetica', 'normal');
            const isTealRow = (data.cell.styles.fillColor as string).toLowerCase() === rowTealColor.toLowerCase();
            doc.setTextColor(isTealRow ? '#E0F2F7' : '#808080');
            doc.setFontSize(9);
            currentY += 5;
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
  doc.setFillColor(gray2Color);
  safeRect(doc, 0, finalY + 5, 84, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  safeText(doc, `Due Date: ${formatDateString(qData.expiry_date)}`, padX, finalY + 10.5);
  
  doc.setTextColor(17, 17, 17);
  const labelX = 130;
  const valueX = pageWidth - padX;
  safeText(doc, 'Sub Total', labelX, finalY + 10.5);
  safeText(doc, formatIDR(qData.subtotal), valueX, finalY + 10.5, { align: 'right' });
  
  const grandTotalY = finalY + 18.5;
  doc.setFillColor(tealColor);
  safeRect(doc, 120, grandTotalY, 90, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  safeText(doc, 'Grand Total', labelX, grandTotalY + 6.5);
  safeText(doc, formatIDR(qData.total), valueX, grandTotalY + 6.5, { align: 'right' });

  const bottomY = grandTotalY + 30;
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  safeText(doc, config.signature_name || '', pageWidth - 55, bottomY + 22, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  safeText(doc, config.signature_company || '', pageWidth - 55, bottomY + 27, { align: 'center' });
};
