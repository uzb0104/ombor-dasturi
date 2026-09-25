import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatSom } from "@/lib/constants";
import { paymentLabel } from "@/lib/i18n/helpers";
import type { Expense, Sale, Product, Customer } from "@/lib/types";
import { FileText, Printer } from "lucide-react";

type Translate = (key: string, params?: Record<string, string | number>) => string;

type ProductBreakdown = {
  productId: string;
  name: string;
  vehicle: string;
  totalQty: number;
  totalRevenue: number;
  totalProfit: number;
  totalBuyValue: number;
};

type ReportsPrintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: "today" | "week" | "month" | "all";
  totalSales: number;
  totalDiscount: number;
  totalProfit: number;
  productBreakdown: ProductBreakdown[];
  filteredSales: Sale[];
  filteredExpenses: Expense[];
  customers: Customer[];
  t: Translate;
};

export function ReportsPrintDialog({
  open,
  onOpenChange,
  period,
  totalSales,
  totalDiscount,
  totalProfit,
  productBreakdown,
  filteredSales,
  customers,
  t,
}: ReportsPrintDialogProps) {
  const periodLabel =
    period === "today"
      ? "KUNLIK"
      : period === "week"
        ? "HAFTALIK"
        : period === "month"
          ? "OYLIK"
          : "UMUMIY";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-6 bg-card border rounded-2xl shadow-elevated overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> {t("reports.printDialog")}
          </DialogTitle>
        </DialogHeader>
        <div
          id="print-area"
          className="p-6 bg-white text-black font-sans text-sm space-y-6 rounded-xl border shadow-sm"
        >
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">AutoERP Pro</h1>
              <p className="text-xs text-gray-500 mt-1">{t("reports.systemDesc")}</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold text-gray-700">{periodLabel} HISOBOT</h2>
              <p className="text-xs text-gray-500 mt-1">
                Sana: {new Date().toLocaleDateString("uz-UZ")}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Moliyaviy Ko'rsatkichlar
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <Metric label="Jami sotuv" value={formatSom(totalSales)} />
              <Metric
                label="Jami chegirma"
                value={`−${formatSom(totalDiscount)}`}
                valueClass="text-red-600"
              />
              <Metric
                label="Sof foyda"
                value={`+${formatSom(totalProfit)}`}
                valueClass="text-green-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Sotilgan tovarlar tafsiloti
            </h3>
            <table className="w-full text-left text-xs border">
              <thead>
                <tr className="bg-gray-100 border-b font-bold">
                  <th className="p-2">Tovar</th>
                  <th className="p-2">Brend</th>
                  <th className="p-2 text-center">Soni</th>
                  <th className="p-2 text-right">Sotuv summasi</th>
                  <th className="p-2 text-right">Foyda</th>
                </tr>
              </thead>
              <tbody>
                {productBreakdown.map((product) => (
                  <tr key={product.productId} className="border-b last:border-0">
                    <td className="p-2 font-medium">{product.name}</td>
                    <td className="p-2 text-gray-600">{product.vehicle}</td>
                    <td className="p-2 text-center tabular-nums">{product.totalQty}</td>
                    <td className="p-2 text-right tabular-nums">
                      {formatSom(product.totalRevenue)}
                    </td>
                    <td className="p-2 text-right text-green-700 font-semibold tabular-nums">
                      +{formatSom(product.totalProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Sotuvlar tafsiloti
            </h3>
            <table className="w-full text-left text-xs border">
              <thead>
                <tr className="bg-gray-100 border-b font-bold">
                  <th className="p-2">Sana</th>
                  <th className="p-2">Mijoz</th>
                  <th className="p-2 text-right">Chegirma</th>
                  <th className="p-2 text-right">Jami</th>
                  <th className="p-2 text-right">Foyda</th>
                  <th className="p-2">To'lov</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredSales]
                  .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                  .slice(0, 30)
                  .map((sale) => {
                    const customer = customers.find((item) => item.id === sale.customerId);
                    return (
                      <tr key={sale.id} className="border-b last:border-0">
                        <td className="p-2 tabular-nums">
                          {new Date(sale.date).toLocaleDateString("uz-UZ")}
                        </td>
                        <td className="p-2 font-medium">{customer?.name || "Umumiy mijoz"}</td>
                        <td className="p-2 text-right text-red-600 tabular-nums">
                          {sale.discount > 0 ? `−${formatSom(sale.discount)}` : "—"}
                        </td>
                        <td className="p-2 text-right font-semibold tabular-nums">
                          {formatSom(sale.total)}
                        </td>
                        <td className="p-2 text-right text-green-700 font-semibold tabular-nums">
                          +{formatSom(sale.profit)}
                        </td>
                        <td className="p-2">{paymentLabel(t, sale.paymentType)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="border-t pt-4 text-center text-[10px] text-gray-400">
            {t("common.autoGenerated")}
          </div>
        </div>
        <DialogFooter className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> {t("reports.printTitle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-gray-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="border p-3 rounded-lg bg-gray-50">
      <span className="text-[10px] text-gray-500 block uppercase font-medium">{label}</span>
      <span className={`text-base font-bold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
