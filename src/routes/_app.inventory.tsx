import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom, formatNumber } from "@/lib/constants";
import { Package, Warehouse, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/inventory")({ component: InventoryPage });

function InventoryPage() {
  const { products, vehicleFilter } = useStore();
  const list = vehicleFilter === "all" ? products : products.filter(p => p.vehicle === vehicleFilter);
  const total = list.reduce((a, p) => a + p.buyPrice * p.quantity, 0);
  const low = list.filter(p => p.quantity <= p.minQty).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Omborxona" subtitle="Real vaqtli zaxira holati" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Ombor qiymati" value={formatSom(total)} icon={Warehouse} accent="primary" />
        <StatCard label="Jami tovarlar" value={formatNumber(list.length)} icon={Package} accent="info" />
        <StatCard label="Kam qolgan" value={String(low)} icon={AlertTriangle} accent="destructive" />
      </div>

      <Card className="rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tovar</TableHead>
              <TableHead>Brend</TableHead>
              <TableHead className="text-right">Miqdor</TableHead>
              <TableHead className="text-right">Sotib olish</TableHead>
              <TableHead className="text-right">Sotuv</TableHead>
              <TableHead className="text-right">Umumiy qiymati</TableHead>
              <TableHead>Holat</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{p.name}<div className="text-xs text-muted-foreground">{p.sku}</div></TableCell>
                  <TableCell>{p.vehicle}</TableCell>
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
