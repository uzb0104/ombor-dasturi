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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/sales")({ component: SalesPage });

type Mode = "cash" | "credit";

type Form = {
  vehicle: string;
  productId: string;
  qty: number;
  price: number;
  discount: number;
  paymentType: "Naqd" | "Karta" | "Qarz";
  customerId: string; // existing customer id, or "" for new
  // new customer fields (used when credit + no customer selected)
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
  const { sales, customers, products, employees, addSale, addCustomer } = useStore();
  const [period, setPeriod] = useState("all");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("cash");
  const [form, setForm] = useState<Form>(emptyForm());

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

  const submit = () => {
    if (!form.productId || !product) { toast.error("Tovarni tanlang"); return; }
    if (product.quantity < form.qty) { toast.error("Yetarli zaxira yo'q"); return; }

    let customerId: string | null = form.customerId || null;
    if (mode === "credit") {
      if (!customerId) {
        if (!form.custName.trim() || !form.custPhone.trim()) {
          toast.error("Qarz uchun mijoz ism va telefon majburiy"); return;
        }
        const newId = `cust_${Math.random().toString(36).slice(2, 9)}`;
        addCustomer({
          id: newId, name: form.custName.trim(), phone: form.custPhone.trim(),
          address: form.custAddress.trim(), vehicle: (form.vehicle as any) || VEHICLE_BRANDS[0],
          totalPurchases: 0, debt: 0,
        });
        customerId = newId;
      }
    }

    const price = form.price || product.sellPrice;
    addSale({
      id: `sale_${Math.random().toString(36).slice(2,9)}`,
      date: new Date().toISOString(),
      customerId,
      sellerId: employees.find(e => e.role === "Sotuvchi")?.id || employees[0]!.id,
      items: [{ productId: product.id, qty: form.qty, price, buyPrice: product.buyPrice }],
      discount: form.discount,
      paymentType: form.paymentType,
      total: netTotal,
      profit: (price - product.buyPrice) * form.qty - form.discount,
    });
    toast.success(mode === "credit" ? "Qarz sotuvi qo'shildi" : "Sotuv qo'shildi");
    setOpen(false);
    setForm(emptyForm());
  };

  const exportCSV = () => {
    const rows = [["Sana","Mijoz","Tovar","Miqdor","Narx","Jami","Foyda","Sotuvchi","To'lov"]];
    filtered.forEach(s => {
      const c = s.customerId ? customers.find(x => x.id === s.customerId) : null;
      const e = employees.find(x => x.id === s.sellerId);
      s.items.forEach(i => {
        const p = products.find(x => x.id === i.productId);
        rows.push([
          new Date(s.date).toLocaleDateString("uz-UZ"),
          c?.name || "—", p?.name || "", String(i.qty),
          String(i.price), String(s.total), String(s.profit), e?.name || "", s.paymentType,
        ]);
      });
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sotuvlar.csv"; a.click();
    toast.success("CSV yuklandi");
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Sotuvlar" subtitle={`${filtered.length} ta tranzaksiya`} actions={
        <>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Chop etish</Button>
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
                  <SelectContent>{VEHICLE_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
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
                  <SelectContent>{["Naqd","Karta"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
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
        <StatCard label="Tranzaksiyalar" value={String(filtered.length)} icon={ShoppingCart} accent="info" />
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
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(s => {
                const c = s.customerId ? customers.find(x => x.id === s.customerId) : null;
                const p = products.find(x => x.id === s.items[0]?.productId);
                const i = s.items[0]!;
                return (
                  <TableRow key={s.id} className="hover:bg-muted/40">
                    <TableCell className="text-sm">{new Date(s.date).toLocaleDateString("uz-UZ")}</TableCell>
                    <TableCell className="font-medium">{c?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{p?.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.qty}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatSom(i.price)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatSom(s.total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-success">+{formatSom(s.profit)}</TableCell>
                    <TableCell><Badge variant={s.paymentType === "Qarz" ? "destructive" : "secondary"}>{s.paymentType}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
