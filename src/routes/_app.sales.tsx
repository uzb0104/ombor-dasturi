import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ShoppingCart, TrendingUp, Printer, Download, CreditCard, UserPlus } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { ReceiptPrinter } from "@/components/sales/ReceiptPrinter";

export const Route = createFileRoute("/_app/sales")({ component: SalesPage });

type Mode = "cash" | "credit";

type Form = {
  vehicle: string;
  productId: string;
  qty: number;
  price: number;
  discount: number;
  paymentType: "Naqd" | "Karta" | "Qarz";
  customerId: string;
  custName: string;
  custPhone: string;
  custAddress: string;
};

const emptyForm = (): Form => ({
  vehicle: "", productId: "", qty: 1, price: 0, discount: 0,
  paymentType: "Naqd", customerId: "",
  custName: "", custPhone: "", custAddress: "",
});

function SalesPage() {
  const { sales, customers, products, employees, vehicleBrands, addSale, addCustomer } = useStore();
  const [period, setPeriod] = useState("all");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("cash");
  const [form, setForm] = useState<Form>(emptyForm());

  // Pagination va Server-side Sales
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [paginatedSales, setPaginatedSales] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // Chop etilayotgan chek ma'lumotlari
  const [printSaleData, setPrintSaleData] = useState<any | null>(null);

  const fetchSalesData = async () => {
    try {
      setIsLoadingSales(true);
      const res = await api.sales.getAll(page, limit);
      if (res && 'data' in res) {
        setPaginatedSales(res.data);
        setTotalCount(res.total);
        setTotalPages(res.totalPages);
      } else {
        setPaginatedSales(res || []);
        setTotalCount(res.length || 0);
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error("Sotuvlarni yuklashda xatolik:", err);
      toast.error("Sotuvlarni yuklashda xatolik yuz berdi");
    } finally {
      setIsLoadingSales(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [page]);

  // Jami sotuv va foydani hisoblash (Zustand sales orqali umumiy statistika)
  const filtered = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    const map: Record<string, number> = { today: 0, week: 7, month: 30 };
    if (period === "all") return sales;
    const days = map[period]; if (days === undefined) return sales;
    const from = new Date(now); if (period !== "today") from.setDate(from.getDate() - days);
    return sales.filter(s => new Date(s.date) >= from);
  }, [sales, period]);

  const total = filtered.reduce((a, s) => a + s.total, 0);
  const profit = filtered.reduce((a, s) => a + s.profit, 0);

  const productsForVehicle = useMemo(
    () => form.vehicle ? products.filter(p => p.vehicle === form.vehicle && p.quantity > 0) : [],
    [form.vehicle, products],
  );

  const product = products.find(p => p.id === form.productId);
  const subtotal = (form.price || product?.sellPrice || 0) * form.qty;
  const netTotal = Math.max(0, subtotal - form.discount);

  const openDialog = (m: Mode) => {
    setMode(m);
    setForm({ ...emptyForm(), paymentType: m === "credit" ? "Qarz" : "Naqd" });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.productId || !product) { toast.error("Tovarni tanlang"); return; }
    if (product.quantity < form.qty) { toast.error("Yetarli zaxira yo'q"); return; }

    let customerId: string | null = form.customerId || null;
    let customerNameStr = "";

    if (mode === "credit") {
      if (!customerId) {
        if (!form.custName.trim() || !form.custPhone.trim()) {
          toast.error("Qarz uchun mijoz ism va telefon majburiy"); return;
        }
        const newId = `cust_${Math.random().toString(36).slice(2, 9)}`;
        await addCustomer({
          id: newId, name: form.custName.trim(), phone: form.custPhone.trim(),
          address: form.custAddress.trim(), vehicle: (form.vehicle as any) || (vehicleBrands[0] || ""),
          totalPurchases: 0, debt: 0,
        });
        customerId = newId;
        customerNameStr = form.custName.trim();
      } else {
        customerNameStr = customers.find(c => c.id === customerId)?.name || "";
      }
    } else if (customerId) {
      customerNameStr = customers.find(c => c.id === customerId)?.name || "";
    }

    const price = form.price || product.sellPrice;
    const saleId = `sale_${Math.random().toString(36).slice(2,9)}`;
    const seller = employees.find(e => e.role === "Sotuvchi") || employees[0];

    try {
      await addSale({
        id: saleId,
        date: new Date().toISOString(),
        customerId,
        sellerId: seller?.id || "unknown",
        items: [{ productId: product.id, qty: form.qty, price, buyPrice: product.buyPrice }],
        discount: form.discount,
        paymentType: form.paymentType,
        total: netTotal,
        profit: (price - product.buyPrice) * form.qty - form.discount,
      });

      // Chek chop etish oynasini ochish uchun ma'lumotlarni sozlash
      setPrintSaleData({
        saleId,
        date: new Date().toISOString(),
        sellerName: seller?.name || "Noma'lum",
        customerName: customerNameStr || undefined,
        items: [{ productName: product.name, qty: form.qty, price }],
        discount: form.discount,
        total: netTotal,
        paymentType: form.paymentType === "CASH" ? "Naqd" : form.paymentType === "CARD" ? "Karta" : form.paymentType === "DEBT" ? "Qarz" : form.paymentType
      });

      toast.success(mode === "credit" ? "Qarz sotuvi qo'shildi" : "Sotuv qo'shildi");
      setOpen(false);
      setForm(emptyForm());
      
      // Chekni avtomatik chop etish dialogni chaqirish
      setTimeout(() => {
        window.print();
      }, 500);

      // Jadvalni qayta yuklash
      fetchSalesData();
    } catch (err: any) {
      toast.error(err.message || "Sotuvni amalga oshirishda xatolik");
    }
  };

  // Excel eksport
  const handleExportExcel = () => {
    const dataToExport = paginatedSales.map(s => {
      const c = s.customerId ? customers.find(x => x.id === s.customerId) : null;
      const p = products.find(x => x.id === s.items[0]?.productId);
      const i = s.items[0] || { qty: 0, price: 0 };
      return {
        "ID": s.id.slice(0, 8).toUpperCase(),
        "Sana": new Date(s.date).toLocaleDateString("uz-UZ"),
        "Mijoz": c?.name || "Mijozsiz",
        "Tovar": p?.name || "Noma'lum",
        "Miqdor": i.qty,
        "Narxi (UZS)": i.price,
        "Chegirma (UZS)": s.discount,
        "Jami (UZS)": s.total,
        "Foyda (UZS)": s.profit,
        "To'lov turi": s.paymentType
      };
    });
    exportToExcel(dataToExport, "sotuvlar_tarixi");
    toast.success("Excel fayli yaratildi va yuklandi");
  };

  // PDF eksport
  const handleExportPDF = () => {
    const headers = ["ID", "Sana", "Mijoz", "Tovar", "Miqdor", "Jami (UZS)", "To'lov"];
    const rows = paginatedSales.map(s => {
      const c = s.customerId ? customers.find(x => x.id === s.customerId) : null;
      const p = products.find(x => x.id === s.items[0]?.productId);
      const i = s.items[0] || { qty: 0 };
      return [
        s.id.slice(0, 8).toUpperCase(),
        new Date(s.date).toLocaleDateString("uz-UZ"),
        c?.name || "Mijozsiz",
        p?.name || "Noma'lum",
        i.qty.toString(),
        s.total.toLocaleString() + " UZS",
        s.paymentType
      ];
    });
    exportToPDF(headers, rows, "Sotuvlar Tarixi Hisoboti", "sotuvlar_tarixi");
    toast.success("PDF hisoboti yuklandi");
  };

  // Chekni qo'lda chop etish
  const printReceipt = (s: any) => {
    const c = s.customerId ? customers.find(x => x.id === s.customerId) : null;
    const p = products.find(x => x.id === s.items[0]?.productId);
    const i = s.items[0]!;
    
    setPrintSaleData({
      saleId: s.id,
      date: s.date,
      sellerName: s.sellerName || "Noma'lum",
      customerName: c?.name || undefined,
      items: [{ productName: p?.name || "Mahsulot", qty: i.qty, price: i.price }],
      discount: s.discount,
      total: s.total,
      paymentType: s.paymentType
    });

    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Sotuvlar" subtitle={`${totalCount || filtered.length} ta tranzaksiya`} actions={
        <>
          <Button variant="outline" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Button variant="outline" onClick={handleExportPDF}><Printer className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" onClick={() => openDialog("credit")}>
            <CreditCard className="h-4 w-4 mr-1" />Qarzga sotish
          </Button>
          <Button onClick={() => openDialog("cash")}><Plus className="h-4 w-4 mr-1" />Yangi sotuv</Button>
        </>
      } />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode === "credit" ? "Qarzga sotish" : "Yangi sotuv"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Avtomobil modeli *</Label>
                <Select value={form.vehicle} onValueChange={(v) => setForm({ ...form, vehicle: v, productId: "", price: 0 })}>
                  <SelectTrigger><SelectValue placeholder="Modelni tanlang" /></SelectTrigger>
                  <SelectContent>{vehicleBrands.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tovar *</Label>
                <Select
                  value={form.productId}
                  onValueChange={(v) => setForm({ ...form, productId: v, price: products.find(p => p.id === v)?.sellPrice || 0 })}
                  disabled={!form.vehicle}
                >
                  <SelectTrigger><SelectValue placeholder={form.vehicle ? "Tovarni tanlang" : "Avval modelni tanlang"} /></SelectTrigger>
                  <SelectContent>
                    {productsForVehicle.length === 0 && form.vehicle && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">Bu modelda zaxiradagi tovar yo'q</div>
                    )}
                    {productsForVehicle.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.quantity} dona)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div><Label>Miqdor</Label><Input type="number" min={1} value={form.qty} onChange={(e) => setForm({...form, qty: +e.target.value})} /></div>
              <div><Label>Narx</Label><Input type="number" value={form.price} onChange={(e) => setForm({...form, price: +e.target.value})} /></div>
              <div><Label>Chegirma</Label><Input type="number" value={form.discount} onChange={(e) => setForm({...form, discount: +e.target.value})} /></div>
            </div>

            {mode === "cash" && (
              <div>
                <Label>To'lov turi</Label>
                <Select value={form.paymentType} onValueChange={(v) => setForm({...form, paymentType: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Naqd","Karta"].map(p => <SelectItem key={p} value={p === "Naqd" ? "CASH" : "CARD"}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {mode === "credit" && (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserPlus className="h-4 w-4" /> Mijoz ma'lumotlari (qarz uchun)
                </div>
                <div>
                  <Label>Mavjud mijozni tanlash</Label>
                  <Select value={form.customerId || "new"} onValueChange={(v) => setForm({ ...form, customerId: v === "new" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">— Yangi mijoz —</SelectItem>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} · {c.phone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!form.customerId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2"><Label>F.I.SH *</Label><Input value={form.custName} onChange={(e) => setForm({ ...form, custName: e.target.value })} /></div>
                    <div><Label>Telefon *</Label><Input value={form.custPhone} onChange={(e) => setForm({ ...form, custPhone: e.target.value })} placeholder="+998 90 123 45 67" /></div>
                    <div><Label>Manzil</Label><Input value={form.custAddress} onChange={(e) => setForm({ ...form, custAddress: e.target.value })} /></div>
                  </div>
                )}
                {form.customerId && (() => {
                  const c = customers.find(x => x.id === form.customerId);
                  if (!c) return null;
                  return (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>📞 {c.phone}</div>
                      <div>📍 {c.address || "—"}</div>
                      <div>Avval qarzi: <span className="font-semibold text-destructive">{formatSom(c.debt)}</span></div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="rounded-lg bg-muted p-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Jami:</span>
              <span className="font-bold tabular-nums">{formatSom(netTotal)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit}>{mode === "credit" ? "Qarzga sotish" : "Sotuvni saqlash"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Jami sotuv" value={formatSom(total)} icon={ShoppingCart} accent="primary" />
        <StatCard label="Sof foyda" value={formatSom(profit)} icon={TrendingUp} accent="success" />
        <StatCard label="Tranzaksiyalar" value={String(totalCount || filtered.length)} icon={ShoppingCart} accent="info" />
      </div>

      <Card className="p-4 rounded-2xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Tranzaksiyalar tarixi</h3>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="today">Bugun</SelectItem>
              <SelectItem value="week">Hafta</SelectItem>
              <SelectItem value="month">Oy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Sana</TableHead><TableHead>Mijoz</TableHead><TableHead>Tovar</TableHead>
              <TableHead className="text-right">Miqdor</TableHead><TableHead className="text-right">Narx</TableHead>
              <TableHead className="text-right">Jami</TableHead><TableHead className="text-right">Foyda</TableHead>
              <TableHead>To'lov</TableHead>
              <TableHead className="text-right">Chek</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoadingSales ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Sotuvlar yuklanmoqda...</TableCell>
                </TableRow>
              ) : paginatedSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Sotuvlar topilmadi.</TableCell>
                </TableRow>
              ) : (
                paginatedSales.map(s => {
                  const c = s.customerId ? customers.find(x => x.id === s.customerId) : null;
                  const p = products.find(x => x.id === s.items[0]?.productId);
                  const i = s.items[0] || { qty: 0, price: 0 };
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/40">
                      <TableCell className="text-sm">{new Date(s.date).toLocaleDateString("uz-UZ")}</TableCell>
                      <TableCell className="font-medium">{c?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{p?.name || "Noma'lum"}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.qty}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatSom(i.price)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatSom(s.total)}</TableCell>
                      <TableCell className="text-right tabular-nums text-success">+{formatSom(s.profit)}</TableCell>
                      <TableCell><Badge variant={s.paymentType === "Qarz" || s.paymentType === "DEBT" ? "destructive" : "secondary"}>{s.paymentType}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => printReceipt(s)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Sahifalash (Pagination) tugmalari */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 border-t pt-4">
            <div className="text-xs text-muted-foreground">
              Jami {totalCount} tadan {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} ko'rsatilmoqda
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Oldingi
              </Button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)} className="h-8 w-8 p-0">
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Chop etish uchun yashirin Chek komponenti (Faqat print chog'ida ko'rinadi) */}
      {printSaleData && (
        <div className="hidden print:block">
          <ReceiptPrinter
            saleId={printSaleData.saleId}
            date={printSaleData.date}
            sellerName={printSaleData.sellerName}
            customerName={printSaleData.customerName}
            items={printSaleData.items}
            discount={printSaleData.discount}
            total={printSaleData.total}
            paymentType={printSaleData.paymentType}
          />
        </div>
      )}
    </div>
  );
}
