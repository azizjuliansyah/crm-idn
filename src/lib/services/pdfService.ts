import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { Company, Quotation } from '@/lib/types';
import { formatIDR, formatDateString } from '@/lib/utils/formatters';
import { generateTemplate6 } from '@/lib/pdf-templates';

// Helper to load image and get dimensions for jsPDF
const getImgDimensions = (url: string): Promise<{ width: number, height: number, element: HTMLImageElement }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height, element: img });
    img.onerror = reject;
    img.src = url;
  });
};

const safeNum = (val: any, fallback: number = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Service to handle PDF generation for Quotations.
 * This centralizes the complex drawing logic previously found in view components.
 */
export const downloadQuotationPDF = async (q: Quotation, company: Company) => {
  const { data: templateSetting } = await supabase
    .from('document_template_settings')
    .select('*')
    .eq('company_id', company.id)
    .eq('document_type', 'quotation')
    .maybeSingle();

  const templateId = templateSetting?.template_id || 'template1';
  const config = templateSetting?.config || {};

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const tealColor = '#55C7C7';
  const gray2Color = '#9B9B9B';
  const rowTealColor = '#2596BE'; // Ganjil
  const rowLightColor = '#F2F9FB'; // Genap
  const padX = 18;

  const safeText = (text: any, x: number, y: number, options?: any) => {
    doc.text(String(text || ''), safeNum(x), safeNum(y), options);
  };

  const safeRect = (x: number, y: number, w: number, h: number, style?: string) => {
    doc.rect(safeNum(x), safeNum(y), safeNum(w), safeNum(h), style);
  };

  if (templateId === 'template5') {
    doc.setFontSize(8.5);
    doc.setTextColor(17, 17, 17);
    doc.setFont('helvetica', 'normal');
    safeText(config.top_contact || '', pageWidth - padX, 10, { align: 'right' });

    const bannerHeight = 22;
    const startY = 18;

    const logoUrl = config.logo_url || company.logo_url;
    if (logoUrl) {
      try {
        const { width, height, element } = await getImgDimensions(logoUrl);
        const maxWidth = 60;
        const maxHeight = bannerHeight;
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        const finalWidth = width * ratio;
        const finalHeight = height * ratio;

        doc.addImage(element, 'PNG', safeNum(padX), safeNum(startY + (maxHeight - finalHeight) / 2), finalWidth, finalHeight, undefined, 'FAST');
      } catch (e) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        safeText(company.name, padX, startY + 12);
      }
    } else {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      safeText(company.name, padX, startY + 12);
    }

    doc.setFillColor(tealColor);
    safeRect(pageWidth - 110, startY, 110, bannerHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(38);
    doc.setFont('helvetica', 'bold');
    safeText('PENAWARAN', pageWidth - 100, startY + 15);

    doc.setTextColor(17, 17, 17);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    safeText('INVOICE TO:', padX, 55);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    safeText(q.client?.client_company?.name || 'PERORANGAN', padX, 62);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const upName = `${q.client?.salutation || ''} ${q.client?.name || ''}`.trim();
    safeText(upName, padX, 68);
    safeText(`P: ${String(q.client?.whatsapp || '-')}`, padX, 74);
    safeText(`E: ${String(q.client?.email || '-')}`, padX, 79);

    const metaX = 130;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    safeText('QUOTATION NO', metaX, 55);
    safeText(':', metaX + 30, 55);
    safeText(q.number || '', metaX + 35, 55);

    safeText('DATE', metaX, 61);
    safeText(':', metaX + 30, 61);
    safeText(formatDateString(q.date), metaX + 35, 61);

    safeText('DUE DATE', metaX, 67);
    safeText(':', metaX + 30, 67);
    doc.setFont('helvetica', 'bold');
    safeText(formatDateString(q.expiry_date), metaX + 35, 67);

    autoTable(doc, {
      startY: 95,
      head: [['Item / Description', 'Price', 'Qty', 'Total']],
      body: q.quotation_items?.map(it => [
        `${it.products?.name || ''}\n${it.description || ''}`,
        formatIDR(it.price),
        `${it.qty} ${it.unit_name || ''}`,
        formatIDR(it.total)
      ]) || [],
      theme: 'plain',
      headStyles: {
        fillColor: tealColor,
        textColor: '#FFFFFF',
        fontSize: 11,
        fontStyle: 'bold',
        minCellHeight: 12,
        valign: 'middle',
        halign: 'left'
      },
      bodyStyles: {
        fillColor: rowLightColor,
        fontSize: 10,
        textColor: '#111111',
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
            safeRect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');

            let padLeft = 0;
            let padTop = 0;
            if (data.cell.styles.cellPadding) {
              if (typeof data.cell.styles.cellPadding === 'object') {
                padLeft = safeNum((data.cell.styles.cellPadding as any).left, 0);
                padTop = safeNum((data.cell.styles.cellPadding as any).top, 0);
              } else {
                padLeft = safeNum(data.cell.styles.cellPadding, 0);
                padTop = safeNum(data.cell.styles.cellPadding, 0);
              }
            }

            const startX = data.cell.x + padLeft;
            let currentY = data.cell.y + padTop + 4;

            if (productName) {
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(data.cell.styles.textColor as string);
              doc.setFontSize(10);
              safeText(productName, startX, currentY);
            }

            if (descriptionLines.length > 0) {
              doc.setFont('helvetica', 'normal');
              const isTealRow = (data.cell.styles.fillColor as string).toLowerCase() === rowTealColor.toLowerCase();
              doc.setTextColor(isTealRow ? '#E0F2F7' : '#505050');
              doc.setFontSize(9);
              currentY += 5;
              const descText = descriptionLines.join('\n');
              if (descText.trim()) {
                safeText(descText, startX, currentY);
              }
            }
          }
        }
      }
    });

    const finalY = safeNum((doc as any).lastAutoTable?.finalY, 150);

    doc.setFillColor(gray2Color);
    safeRect(0, finalY + 5, 84, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    safeText(`Due Date: ${formatDateString(q.expiry_date)}`, padX, finalY + 10.5);

    doc.setTextColor(17, 17, 17);
    const summaryLabelX = 130;
    const summaryValueX = pageWidth - padX;

    safeText('Sub Total', summaryLabelX, finalY + 10.5);
    safeText(formatIDR(q.subtotal), summaryValueX, finalY + 10.5, { align: 'right' });

    let currentTotalY = finalY + 10.5;

    if (q.discount_value > 0) {
      currentTotalY += 8;
      safeText('Diskon', summaryLabelX, currentTotalY);
      safeText(`-${formatIDR(q.discount_value)}`, summaryValueX, currentTotalY, { align: 'right' });
    }

    if (q.tax_value > 0) {
      currentTotalY += 8;
      safeText('Pajak', summaryLabelX, currentTotalY);
      safeText(formatIDR(q.tax_value), summaryValueX, currentTotalY, { align: 'right' });
    }

    const grandTotalY = currentTotalY + 5.5;
    doc.setFillColor(tealColor);
    safeRect(120, grandTotalY, 90, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    safeText('Grand Total', summaryLabelX, grandTotalY + 6.5);
    safeText(formatIDR(q.total), summaryValueX, grandTotalY + 6.5, { align: 'right' });

    const bottomY = grandTotalY + 30;
    doc.setTextColor(17, 17, 17);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    safeText('Payment via Bank Transfer:', padX, bottomY);
    doc.setFont('helvetica', 'normal');
    safeText(config.payment_info || '-', padX, bottomY + 6);

    doc.setFont('helvetica', 'bold');
    safeText('Note:', padX, bottomY + 18);
    doc.setFont('helvetica', 'normal');
    safeText(config.note_footer || '-', padX, bottomY + 24, { maxWidth: 80 });

    const sigX = pageWidth - 55;
    if (config.signature_url) {
      try {
        const { width, height, element } = await getImgDimensions(config.signature_url);
        const maxWidth = 50;
        const maxHeight = 25;
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        const finalWidth = width * ratio;
        const finalHeight = height * ratio;

        doc.addImage(element, 'PNG', safeNum(sigX - finalWidth / 2), safeNum(bottomY - 5 + (maxHeight - finalHeight) / 2), finalWidth, finalHeight, undefined, 'FAST');
      } catch (e) { }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      safeText('[signature image]', sigX, bottomY + 10, { align: 'center' });
    }

    doc.setTextColor(17, 17, 17);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    safeText(config.signature_name || '', sigX, bottomY + 22, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    safeText(config.signature_company || '', sigX, bottomY + 27, { align: 'center' });

    doc.setFillColor(143, 143, 143);
    safeRect(0, pageHeight - 16, pageWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    safeText(config.footer_bar_text || 'Thank you for your business', pageWidth / 2, pageHeight - 11.5, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    safeText(config.footer_text || '', pageWidth / 2, pageHeight - 5, { align: 'center' });
  } else if (templateId === 'template6') {
    config.document_type = 'quotation';
    const qData = { ...q };
    await generateTemplate6(doc, qData, config, company, pageWidth, padX);
  } else {
    doc.setFillColor('#4F46E5');
    safeRect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    safeText('PENAWARAN HARGA', 20, 25);

    autoTable(doc, {
      startY: 50,
      head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
      body: q.quotation_items?.map(it => [
        String(it.products?.name || it.description || 'Produk'),
        String(it.description || '-'),
        `${it.qty} ${it.unit_name || ''}`,
        formatIDR(it.price),
        formatIDR(it.total)
      ]) || [],
      theme: 'striped',
      headStyles: { fillColor: '#4F46E5', fontSize: 9, halign: 'center' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } }
    });
  }

  doc.save(`${q.number}.pdf`);
};
