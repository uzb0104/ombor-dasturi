import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom, formatNumber } from "@/lib/constants";
import { Package, Warehouse, AlertTriangle, Car, ChevronLeft, Search, Edit, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";


export const Route = createFileRoute("/_app/inventory")({ component: InventoryPage });

function InventoryPage() {
  const { products, vehicleBrands, deleteProduct } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const total = products.reduce((a, p) => a + p.buyPrice * p.quantity, 0);
  const low = products.filter(p => p.quantity <= p.minQty).length;

  const brandStats = useMemo(() =>
    vehicleBrands.map((b: string) => {
      const items = products.filter(p => p.vehicle === b);
      return {
        brand: b,
        count: items.length,
        qty: items.reduce((a, p) => a + p.quantity, 0),
        value: items.reduce((a, p) => a + p.buyPrice * p.quantity, 0),
        low: items.filter(p => p.quantity <= p.minQty).length,
      };
    }), [products, vehicleBrands]);

  const brandProducts = useMemo(() => {
    if (!selected) return [];
    const s = search.toLowerCase();
    return products
      .filter(p => p.vehicle === selected)
      .filter(p => !search || p.name.toLowerCase().includes(s) || (p.barcode || "").includes(search));
  }, [products, selected, search]);

  if (selected) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={selected}
          subtitle={`${brandProducts.length} ta tovar`}
          actions={
            <Button variant="outline" onClick={() => { setSelected(null); setSearch(""); }}>
              <ChevronLeft className="h-4 w-4 mr-1" />Brendlarga qaytish
            </Button>
          }
        />
        <Card className="p-4 rounded-2xl">
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tovar nomi yoki barkod..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tovar</TableHead>
                <TableHead>Kategoriya</TableHead>
                <TableHead className="text-right">Miqdor</TableHead>
                <TableHead className="text-right">Sotib olish</TableHead>
                <TableHead className="text-right">Sotuv</TableHead>
                <TableHead className="text-right">Umumiy qiymati</TableHead>
                <TableHead>Holat</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {brandProducts.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Bu brendda tovar yo'q</TableCell></TableRow>
                )}
                {brandProducts.map(p => (
                  <TableRow key={p.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatSom(p.buyPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatSom(p.sellPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-semibold">{formatSom(p.buyPrice * p.quantity)}</TableCell>
                    <TableCell><StatusBadge qty={p.quantity} min={p.minQty} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Omborxona" subtitle="Avtomobil brendlari bo'yicha zaxira" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Ombor qiymati" value={formatSom(total)} icon={Warehouse} accent="primary" />
        <StatCard label="Jami tovarlar" value={formatNumber(products.length)} icon={Package} accent="info" />
        <StatCard label="Kam qolgan" value={String(low)} icon={AlertTriangle} accent="destructive" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {brandStats.map((b) => (
          <button
            key={b.brand}
            onClick={() => setSelected(b.brand)}
            className="text-left group rounded-2xl border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all animate-fade-in"
          >
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Car className="h-6 w-6" />
              </div>
              {b.low > 0 && (
                <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-medium">
                  {b.low} kam
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-lg font-bold tracking-tight">{b.brand}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{b.count} ta tovar · {formatNumber(b.qty)} dona</div>
            </div>
            <div className="mt-3 pt-3 border-t text-sm">
              <span className="text-muted-foreground">Qiymati: </span>
              <span className="font-semibold">{formatSom(b.value)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
