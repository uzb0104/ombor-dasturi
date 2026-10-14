import { useRef } from "react";
import {
  Printer,
  Download,
  CheckCircle2,
  User,
  Phone,
  Calendar,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatSom } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { useT, useLang } from "@/lib/i18n";
import { downloadSaleReceiptPdf } from "@/lib/receipt-pdf";
import type { Sale } from "@/lib/types";
import { toast } from "sonner";

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  onNewSale?: () => void;
  isNewSaleSuccess?: boolean;
}

export function ReceiptModal({
  open,
  onOpenChange,
  sale,
  onNewSale,
  isNewSaleSuccess = false,
}: ReceiptModalProps) {
  const t = useT();
  const { lang } = useLang();
  const { products, customers, employees } = useStore();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const customer = customers.find((c) => c.id === sale.customerId);
  const seller = employees.find((e) => e.id === sale.sellerId);

  const subtotal = sale.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const discount = sale.discount || 0;
  const isDebt = sale.paymentType === "Qarz";
  const paidAmount = isDebt ? (sale.paid ?? 0) : sale.total;
  const remainingDebt = isDebt ? Math.max(0, sale.total - paidAmount) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadSaleReceiptPdf(sale, { products, customers, employees });
      toast.success(lang === "ru" ? "Чек загружен в формате PDF" : "Chek PDF formatida yuklandi");
    } catch (err) {
      toast.error(lang === "ru" ? "Ошибка при загрузке PDF" : "PDF yuklashda xatolik yuz berdi");
    }
  };

  const paymentLabel =
    sale.paymentType === "Qarz"
      ? lang === "ru"
        ? "Долг"
        : "Qarz"
      : sale.paymentType === "Karta"
        ? lang === "ru"
          ? "Карта"
          : "Karta"
        : lang === "ru"
          ? "Наличные"
          : "Naqd";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border/80 shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isNewSaleSuccess ? (
                <div className="h-9 w-9 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              )}
              <div>
                <DialogTitle className="text-base font-bold">
                  {isNewSaleSuccess
                    ? lang === "ru"
                      ? "Продажа успешно завершена!"
                      : "Savdo muvaffaqiyatli yakunlandi!"
                    : lang === "ru"
                      ? "Чек продажи"
                      : "Sotuv cheki"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  ID: #{sale.id.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>
            <Badge
              variant={
                sale.paymentType === "Qarz"
                  ? "destructive"
                  : sale.paymentType === "Karta"
                    ? "secondary"
                    : "default"
              }
            >
              {paymentLabel}
            </Badge>
          </div>
        </DialogHeader>

        {/* PRINTABLE RECEIPT CONTENT */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <div
            id="print-area"
            ref={receiptRef}
            className="p-5 rounded-xl border border-dashed border-border bg-card text-foreground font-sans text-xs space-y-3.5 print:p-0 print:border-none print:shadow-none"
          >
            {/* Header */}
            <div className="text-center space-y-1 border-b border-dashed border-border/80 pb-3">
              <h2 className="text-base font-black tracking-tight text-foreground uppercase">
                AutoERP Pro
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {lang === "ru"
                  ? "Автозапчасти и аккумуляторы"
                  : "Avto ehtiyot qismlari & Akkumulyatorlar"}
              </p>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-2 pt-1">
                <span>
                  {lang === "ru" ? "Чек" : "Chek"}: #{sale.id.slice(-8).toUpperCase()}
                </span>
                <span>•</span>
                <span>{new Date(sale.date).toLocaleString(lang === "ru" ? "ru-RU" : "uz-UZ")}</span>
              </div>
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-dashed border-border/80 pb-3">
              <div>
                <span className="text-muted-foreground block text-[10px]">
                  {lang === "ru" ? "Клиент:" : "Mijoz:"}
                </span>
                <span className="font-semibold text-foreground">
                  {customer ? customer.name : lang === "ru" ? "Общий клиент" : "Umumiy mijoz"}
                </span>
                {customer?.phone && (
                  <span className="text-[10px] text-muted-foreground block">{customer.phone}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px]">
                  {lang === "ru" ? "Продавец:" : "Sotuvchi:"}
                </span>
                <span className="font-semibold text-foreground">
                  {seller?.name || (lang === "ru" ? "Кассир" : "Kassir")}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 border-b border-dashed border-border/80 pb-3">
              <div className="grid grid-cols-12 text-[10px] font-bold text-muted-foreground uppercase pb-1 border-b border-border/40">
                <span className="col-span-6">{lang === "ru" ? "Товар" : "Mahsulot"}</span>
                <span className="col-span-2 text-center">{lang === "ru" ? "Кол-во" : "Soni"}</span>
                <span className="col-span-4 text-right">{lang === "ru" ? "Сумма" : "Summa"}</span>
              </div>
              {sale.items.map((item, idx) => {
                const p = products.find((prod) => prod.id === item.productId);
                const name = p?.name || item.productName || (lang === "ru" ? "Товар" : "Mahsulot");
                const rowTotal = item.qty * item.price;
                return (
                  <div key={idx} className="grid grid-cols-12 items-center py-1 text-[11px]">
                    <div className="col-span-6 pr-1">
                      <div className="font-medium text-foreground line-clamp-1">{name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatSom(item.price)}
                      </div>
                    </div>
                    <div className="col-span-2 text-center font-semibold text-foreground">
                      {item.qty}
                    </div>
                    <div className="col-span-4 text-right font-semibold text-foreground tabular-nums">
                      {formatSom(rowTotal)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations */}
            <div className="space-y-1.5 text-[11px] pt-1">
              <div className="flex justify-between text-muted-foreground">
                <span>{lang === "ru" ? "Промежуточный итог:" : "Oraliq summa:"}</span>
                <span className="tabular-nums">{formatSom(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>{lang === "ru" ? "Скидка:" : "Chegirma:"}</span>
                  <span className="tabular-nums">-{formatSom(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-foreground pt-1 border-t border-border/80">
                <span>{lang === "ru" ? "ИТОГО К ОПЛАТЕ:" : "JAMI TO'LOV:"}</span>
                <span className="tabular-nums text-primary">{formatSom(sale.total)}</span>
              </div>

              {isDebt && (
                <div className="pt-2 border-t border-dashed border-border/80 space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{lang === "ru" ? "Оплачено сейчас:" : "Hozir to'langan:"}</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatSom(paidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-destructive font-bold">
                    <span>{lang === "ru" ? "Остаток долга:" : "Qolgan qarz:"}</span>
                    <span className="tabular-nums">{formatSom(remainingDebt)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer notice */}
            <div className="text-center text-[10px] text-muted-foreground pt-3 border-t border-dashed border-border/80 space-y-0.5">
              <p className="font-medium">
                {lang === "ru" ? "Спасибо за покупку!" : "Xaridingiz uchun rahmat!"}
              </p>
              <p>
                {lang === "ru"
                  ? "Гарантия действует при наличии чека."
                  : "Kafolat — chek taqdim etilganda amal qiladi."}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t border-border/60 flex flex-col sm:flex-row gap-2 sm:justify-between items-center">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="flex-1 sm:flex-initial"
            >
              <Download className="h-4 w-4 mr-1.5" />
              PDF
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              {lang === "ru" ? "Печать" : "Chop etish"}
            </Button>
          </div>

          {isNewSaleSuccess && onNewSale ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onNewSale();
              }}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {lang === "ru" ? "Начать новую продажу" : "Yangi savdo boshlash"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              {lang === "ru" ? "Закрыть" : "Yopish"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
