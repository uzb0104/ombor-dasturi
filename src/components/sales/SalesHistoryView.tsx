import { useState, useMemo } from "react";
import {
  Search,
  ShoppingCart,
  CreditCard,
  Trash2,
  Receipt,
  Eye,
  FileSpreadsheet,
  Calendar,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard, PaginationBar, usePagination, useConfirm } from "@/components/ui-kit";
import { formatSom } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { Sale } from "@/lib/types";
import { ReceiptModal } from "./ReceiptModal";
import { toast } from "sonner";

export function SalesHistoryView() {
  const { sales, products, deleteSale } = useStore();
  const { confirm, confirmNode } = useConfirm();

  // Filters
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  // Selected sale for receipt preview
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Filtered sales
  const filtered = useMemo(() => {
    let result = sales;

    // Payment type filter
    if (paymentFilter !== "all") {
      result = result.filter((s) => s.paymentType === paymentFilter);
    }

    // Period filter
    if (period !== "all") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const daysMap: Record<string, number> = { today: 0, week: 7, month: 30 };
      const days = daysMap[period];
      if (days !== undefined) {
        const from = new Date(now);
        if (period !== "today") from.setDate(from.getDate() - days);
        result = result.filter((sale) => new Date(sale.date) >= from);
      }
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((sale) => {
        const matchId = sale.id.toLowerCase().includes(q);
        const matchVehicle = sale.vehicle ? sale.vehicle.toLowerCase().includes(q) : false;

        const matchItems = sale.items.some((item) => {
          const p = products.find((prod) => prod.id === item.productId);
          const name = p?.name || item.productName || "";
          const pVeh = p?.vehicle ? String(p.vehicle).toLowerCase() : "";
          return name.toLowerCase().includes(q) || pVeh.includes(q);
        });

        return matchId || matchVehicle || matchItems;
      });
    }

    return result;
  }, [sales, products, period, paymentFilter, search]);

  // Pagination with 50 items per page
  const { paged, page, setPage, totalPages, totalItems, pageSize } = usePagination(filtered, 50);

  const total = useMemo(() => filtered.reduce((sum, s) => sum + s.total, 0), [filtered]);
  const profit = useMemo(() => filtered.reduce((sum, s) => sum + s.profit, 0), [filtered]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Sotuvni bekor qilish",
      description: "Ushbu sotuv bekor qilinsa, tovarlar omborga qaytariladi. Davom etasizmi?",
      confirmText: "Bekor qilish",
      cancelText: "Ortga",
      destructive: true,
    });
    if (ok) {
      deleteSale(id);
      toast.success("Sotuv bekor qilindi");
    }
  };

  // Full Excel Export (.xlsx)
  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const listToExport = filtered.length > 0 ? filtered : sales;

      if (listToExport.length === 0) {
        toast.warning("Eksport qilish uchun hech qanday sotuv mavjud emas");
        return;
      }

      const rows = listToExport.map((sale, index) => {
        const goods = sale.items
          .map((item) => {
            const p = products.find((prod) => prod.id === item.productId);
            const name = p?.name || item.productName || "Tovar";
            const veh = p?.vehicle ? `[${p.vehicle}] ` : "";
            return `${veh}${name} (${item.qty} dona)`;
          })
          .join(", ");

        const totalQty = sale.items.reduce((sum, item) => sum + item.qty, 0);
        const isDebt = sale.paymentType === "Qarz";
        const paidAmount = isDebt ? (sale.paid ?? 0) : sale.total;
        const debtRemaining = isDebt ? Math.max(0, sale.total - paidAmount) : 0;

        return {
          "№": index + 1,
          "Sana va vaqt": new Date(sale.date).toLocaleString("uz-UZ"),
          "Chek ID": sale.id,
          "Xarid qilingan tovarlar": goods,
          "Umumiy soni (dona)": totalQty,
          "Jami summa (so'm)": sale.total,
          "To'langan summa (so'm)": paidAmount,
          "Qarz qoldig'i (so'm)": debtRemaining,
          "Foyda (so'm)": sale.profit,
          "To'lov usuli": sale.paymentType,
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Ustun kengliklarini moslash
      ws["!cols"] = [
        { wch: 6 }, // №
        { wch: 20 }, // Sana
        { wch: 22 }, // Chek ID
        { wch: 45 }, // Tovarlar
        { wch: 18 }, // Soni
        { wch: 20 }, // Jami summa
        { wch: 20 }, // To'langan
        { wch: 18 }, // Qarz
        { wch: 18 }, // Foyda
        { wch: 15 }, // To'lov
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sotuvlar Tarixi");
      XLSX.writeFile(wb, `sotuvlar_${new Date().toISOString().slice(0, 10)}.xlsx`);

      toast.success(
        `Jami ${listToExport.length} ta sotuv Excel formatida muvaffaqiyatli yuklandi!`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Excel faylni yaratishda xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Jami tushum"
          value={formatSom(total)}
          icon={ShoppingCart}
          accent="primary"
        />
        <StatCard label="Sof foyda" value={formatSom(profit)} icon={CreditCard} accent="success" />
        <StatCard
          label="Tranzaksiyalar soni"
          value={`${filtered.length} ta`}
          icon={Receipt}
          accent="info"
        />
      </div>

      {/* Main Table Card */}
      <Card className="p-5 rounded-2xl border-border/70 shadow-sm bg-card space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tovar nomi, chek ID yoki mashina modeli bo'yicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-10 text-xs bg-muted/20 rounded-xl border-border/70 focus-visible:ring-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Selectors and export */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36 h-10 text-xs bg-muted/20 rounded-xl border-border/70">
                <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Davr" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha vaqt</SelectItem>
                <SelectItem value="today">Bugun</SelectItem>
                <SelectItem value="week">Oxirgi 7 kun</SelectItem>
                <SelectItem value="month">Shu oy</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-36 h-10 text-xs bg-muted/20 rounded-xl border-border/70">
                <CreditCard className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="To'lov turi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha to'lovlar</SelectItem>
                <SelectItem value="Naqd">Naqd</SelectItem>
                <SelectItem value="Karta">Karta</SelectItem>
                <SelectItem value="O'tkazma">O'tkazma</SelectItem>
                <SelectItem value="Qarz">Qarz</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={exportExcel}
              className="h-10 rounded-xl text-xs font-semibold border-emerald-600/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              Excel (.xlsx)
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-14 text-center font-bold">№</TableHead>
                <TableHead className="w-32 font-bold">Sana</TableHead>
                <TableHead className="min-w-64 font-bold">Xarid qilingan tovarlar</TableHead>
                <TableHead className="text-right font-bold w-20">Soni</TableHead>
                <TableHead className="text-right font-bold w-32">Jami summa</TableHead>
                <TableHead className="text-right font-bold w-28">To'langan</TableHead>
                <TableHead className="text-right font-bold w-28">Qarz qoldig'i</TableHead>
                <TableHead className="text-center font-bold w-24">To'lov</TableHead>
                <TableHead className="text-right pr-4 font-bold w-24">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    Sotuvlar topilmadi.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((sale, idx) => {
                  const isDebt = sale.paymentType === "Qarz";
                  const paid = isDebt ? (sale.paid ?? 0) : sale.total;
                  const remaining = isDebt ? Math.max(0, sale.total - paid) : 0;
                  const totalQty = sale.items.reduce((s, i) => s + i.qty, 0);
                  const orderNumber = (page - 1) * pageSize + idx + 1;

                  return (
                    <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors">
                      {/* Tartib raqami (1, 2, 3...) */}
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted/60 text-xs font-bold text-muted-foreground tabular-nums">
                          {orderNumber}
                        </span>
                      </TableCell>

                      {/* Sana */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {new Date(sale.date).toLocaleDateString("uz-UZ")}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {new Date(sale.date).toLocaleTimeString("uz-UZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>

                      {/* Xarid qilingan tovarlar */}
                      <TableCell className="min-w-[280px]">
                        <div className="space-y-2 py-1">
                          {sale.items.slice(0, 3).map((item, itemIdx) => {
                            const p = products.find((prod) => prod.id === item.productId);
                            const name = p?.name || item.productName || "Mahsulot";
                            const vehicle = p?.vehicle || sale.vehicle;

                            return (
                              <div key={itemIdx} className="space-y-0.5">
                                {/* Mahsulot nomi va soni (birinchi, aniq va to'liq ko'rinadi) */}
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-xs text-foreground">
                                    {name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                    ({item.qty} dona)
                                  </span>
                                </div>

                                {/* Mashina modeli (pastga tushirilgan, tovar nomiga xalaqit qilmaydi) */}
                                {vehicle && (
                                  <div className="flex items-center flex-wrap gap-1">
                                    <span className="inline-block text-[10px] font-medium text-muted-foreground/90 bg-muted/60 px-1.5 py-0.2 rounded border border-border/60">
                                      {vehicle}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {sale.items.length > 3 && (
                            <div className="text-[11px] text-primary font-medium">
                              + yana {sale.items.length - 3} ta tovar
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Soni */}
                      <TableCell className="text-right text-xs font-semibold tabular-nums">
                        {totalQty} ta
                      </TableCell>

                      {/* Jami summa */}
                      <TableCell className="text-right text-xs sm:text-sm font-bold text-foreground tabular-nums">
                        {formatSom(sale.total)}
                      </TableCell>

                      {/* To'langan */}
                      <TableCell className="text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatSom(paid)}
                      </TableCell>

                      {/* Qarz qoldig'i */}
                      <TableCell className="text-right text-xs font-semibold tabular-nums">
                        {remaining > 0 ? (
                          <span className="text-destructive font-bold">{formatSom(remaining)}</span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>

                      {/* To'lov turi */}
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            sale.paymentType === "Qarz"
                              ? "destructive"
                              : sale.paymentType === "Karta"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[10px] font-semibold px-2 py-0.5"
                        >
                          {sale.paymentType}
                        </Badge>
                      </TableCell>

                      {/* Amallar */}
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPreviewSale(sale);
                              setPreviewOpen(true);
                            }}
                            title="Chekni ko'rish / Chop etish"
                            className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sale.id)}
                            title="Bekor qilish"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination (50 tadan) */}
        <div className="pt-2">
          <PaginationBar
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </div>
      </Card>

      {/* Receipt Preview Modal */}
      <ReceiptModal open={previewOpen} onOpenChange={setPreviewOpen} sale={previewSale} />

      {confirmNode}
    </div>
  );
}
