import React from 'react';
import { formatSom } from '@/lib/constants';

interface ReceiptItem {
  productName: string;
  qty: number;
  price: number;
}

interface ReceiptPrinterProps {
  saleId: string;
  date: string;
  sellerName: string;
  customerName?: string;
  items: ReceiptItem[];
  discount: number;
  total: number;
  paymentType: string;
}

export const ReceiptPrinter: React.FC<ReceiptPrinterProps> = ({
  saleId,
  date,
  sellerName,
  customerName,
  items,
  discount,
  total,
  paymentType,
}) => {
  return (
    <div className="receipt-print-container font-mono text-xs text-black p-4 bg-white max-w-[320px] mx-auto border border-gray-200 rounded-md">
      {/* Chop etish uchun maxsus CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print-container, .receipt-print-container * {
            visibility: visible;
          }
          .receipt-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            border: none;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>

      {/* Chek sarlavhasi */}
      <div className="text-center space-y-1 mb-4 border-b border-dashed border-gray-300 pb-2">
        <h2 className="text-sm font-bold uppercase tracking-wider">AutoERP Pro</h2>
        <p className="text-[10px] text-gray-500">Moy va ehtiyot qismlar do'koni</p>
        <p className="text-[10px]">Toshkent sh., Chilonzor tumani</p>
        <p className="text-[10px]">Tel: +998 (90) 123-45-67</p>
      </div>

      {/* Chek tafsilotlari */}
      <div className="space-y-1 mb-3 border-b border-dashed border-gray-300 pb-2 text-[10px]">
        <div><strong>Chek #:</strong> {saleId.slice(0, 8).toUpperCase()}</div>
        <div><strong>Sana:</strong> {new Date(date).toLocaleString('uz-UZ')}</div>
        <div><strong>Sotuvchi:</strong> {sellerName}</div>
        {customerName && <div><strong>Mijoz:</strong> {customerName}</div>}
      </div>

      {/* Mahsulotlar jadvali */}
      <div className="mb-3">
        <div className="flex justify-between font-bold border-b border-gray-200 pb-1 mb-1 text-[10px]">
          <span>Nomi</span>
          <span>Miqd. x Narxi = Jami</span>
        </div>
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div key={idx} className="text-[10px]">
              <div className="font-medium truncate">{item.productName}</div>
              <div className="flex justify-between text-gray-700 pl-2">
                <span>
                  {item.qty} dona x {formatSom(item.price)}
                </span>
                <span>{formatSom(item.qty * item.price)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Jami va hisob-kitob */}
      <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-[10px] font-semibold">
        {discount > 0 && (
          <div className="flex justify-between font-normal text-gray-600">
            <span>Chegirma:</span>
            <span>-{formatSom(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-100">
          <span>TO'LANADI:</span>
          <span>{formatSom(total)}</span>
        </div>
        <div className="flex justify-between font-normal text-gray-600 pt-1">
          <span>To'lov turi:</span>
          <span>{paymentType}</span>
        </div>
      </div>

      {/* Chek yakuni */}
      <div className="text-center mt-6 border-t border-dashed border-gray-300 pt-3 space-y-1">
        <p className="font-bold text-[10px]">XARIDINGIZ UCHUN RAHMAT!</p>
        <p className="text-[9px] text-gray-500">Qaytarish va almashtirish 3 kun ichida amalga oshiriladi.</p>
        <div className="text-[8px] text-gray-400 mt-2 font-sans">Powered by AutoERP Pro</div>
      </div>
    </div>
  );
};
