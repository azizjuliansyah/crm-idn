import { jsPDF } from 'jspdf';

// Helper to load image and get dimensions for jsPDF
export const getImgDimensions = (url: string): Promise<{ width: number, height: number, element: HTMLImageElement }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height, element: img });
    img.onerror = reject;
    img.src = url;
  });
};

export const formatIDR = (num: number = 0) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num).replace('Rp', 'Rp');
};

export const formatDateString = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// --- Safety Helpers ---
export const safeNum = (val: any, fallback: number = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

export const safeText = (doc: jsPDF, text: any, x: number, y: number, options?: any) => {
  doc.text(String(text || ''), safeNum(x), safeNum(y), options);
};

export const safeRect = (doc: jsPDF, x: number, y: number, w: number, h: number, style?: string) => {
  doc.rect(safeNum(x), safeNum(y), safeNum(w), safeNum(h), style);
};
