import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Ma'lumotlarni Excel (XLSX) formatida yuklab olish.
 * 
 * @param data - Obyektlar massivi
 * @param fileName - Yuklanuvchi fayl nomi (kengaytmasiz)
 */
export const exportToExcel = (data: any[], fileName: string) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ma\'lumotlar');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Excel eksportida xatolik:', error);
  }
};

/**
 * Ma'lumotlarni PDF formatida yuklab olish.
 * 
 * @param headers - Ustunlar nomlari (Massiv)
 * @param rows - Jadval satrlari (Ustunlar ketma-ketligida qiymatlar massivi)
 * @param title - Hujjat sarlavhasi
 * @param fileName - Yuklanuvchi fayl nomi (kengaytmasiz)
 */
export const exportToPDF = (
  headers: string[],
  rows: any[][],
  title: string,
  fileName: string
) => {
  try {
    const doc = new jsPDF();
    
    // Sarlavha yozish (UTF-8 qo'llab-quvvatlash uchun standard shriftda)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Sana: ${new Date().toLocaleString('uz-UZ')}`, 14, 28);
    
    // Jadval yaratish
    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 33,
      theme: 'striped',
      styles: { fontSize: 8, font: 'helvetica' },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] }, // Indigo primary color
      alternateRowStyles: { fillColor: [243, 244, 246] }
    });
    
    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('PDF eksportida xatolik:', error);
  }
};
