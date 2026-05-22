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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ShoppingCart, TrendingUp, Printer, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/sales")({ component: SalesPage });

function SalesPage() {
  const { sales, customers, products, employees, addSale } = useStore();
  const [period, setPeriod] = useState("all");
  const [open, setOpen] = useState(false);

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

  const [form, setForm] = useState({ customerId: "", productId: "", qty: 1, price: 0, discount: 0, paymentType: "Naqd" as "Naqd"|"Karta"|"Qarz" });

  const product = products.find(p => p.id === form.productId);
  const subtotal = (form.price || product?.sellPrice || 0) * form.qty;
  const netTotal = subtotal - form.discount;

  const submit = () => {
    if (!form.customerId || !form.productId) { toast.error("Mijoz va tovar tanlang"); return; }
    if (!product) return;
    if (product.quantity < form.qty) { toast.error("Yetarli zaxira yo'q"); return; }
    const price = form.price || product.sellPrice;
    addSale({
      id: `sale_${Math.random().toString(36).slice(2,9)}`,
      date: new Date().toISOString(),
      customerId: form.customerId,
      sellerId: employees.find(e => e.role === "Sotuvchi")?.id || employees[0]!.id,
      items: [{ productId: product.id, qty: form.qty, price, buyPrice: product.buyPrice }],
      discount: form.discount,
      paymentType: form.paymentType,
      total: netTotal,
      profit: (price - product.buyPrice) * form.qty - form.discount,
    });
    toast.success("Sotuv qo'shildi");
    setOpen(false);
    setForm({ customerId: "", productId: "", qty: 1, price: 0, discount: 0, paymentType: "Naqd" });
  };

  const exportCSV = () => {
    const rows = [["Sana","Mijoz","Tovar","Miqdor","Narx","Jami","Foyda","Sotuvchi","To'lov"]];
    filtered.forEach(s => {
      const c = customers.find(x => x.id === s.customerId);
      const e = employees.find(x => x.id === s.sellerId);
      s.items.forEach(i => {
        const p = products.find(x => x.id === i.productId);
        rows.push([
          new Date(s.date).toLocaleDateString("uz-UZ"),
          c?.name || "", p?.name || "", String(i.qty),
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Yangi sotuv</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yangi sotuv</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Mijoz</Label>
                  <Select value={form.customerId} onValueChange={(v) => setForm({...form, customerId: v})}>
                    <SelectTrigger><SelectValue placeholder="Mijozni tanlang" /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.vehicle}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Tovar</Label>
                  <Select value={form.productId} onValueChange={(v) => setForm({...form, productId: v, price: products.find(p => p.id === v)?.sellPrice || 0})}>
                    <SelectTrigger><SelectValue placeholder="Tovarni tanlang" /></SelectTrigger>
                    <SelectContent>{products.filter(p => p.quantity > 0).map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.quantity} dona)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Miqdor</Label><Input type="number" min={1} value={form.qty} onChange={(e) => setForm({...form, qty: +e.target.value})} /></div>
                  <div><Label>Narx</Label><Input type="number" value={form.price} onChange={(e) => setForm({...form, price: +e.target.value})} /></div>
                  <div><Label>Chegirma</Label><Input type="number" value={form.discount} onChange={(e) => setForm({...form, discount: +e.target.value})} /></div>
                </div>
                <div><Label>To'lov turi</Label>
                  <Select value={form.paymentType} onValueChange={(v) => setForm({...form, paymentType: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Naqd","Karta","Qarz"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg bg-muted p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Jami:</span>
                  <span className="font-bold tabular-nums">{formatSom(netTotal)}</span>
                </div>
              </div>
              <DialogFooter><Button onClick={submit}>Sotuvni saqlash</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      } />

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
                const c = customers.find(x => x.id === s.customerId);
                const p = products.find(x => x.id === s.items[0]?.productId);
                const i = s.items[0]!;
                return (
                  <TableRow key={s.id} className="hover:bg-muted/40">
                    <TableCell className="text-sm">{new Date(s.date).toLocaleDateString("uz-UZ")}</TableCell>
                    <TableCell className="font-medium">{c?.name}</TableCell>
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
