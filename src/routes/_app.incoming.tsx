import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/incoming")({ component: IncomingPage });

function IncomingPage() {
  const { incoming, products, suppliers } = useStore();
  return (
    <div className="space-y-5">
      <PageHeader title="Kirimlar" subtitle={`${incoming.length} ta kirim yozuvi`} />
      <Card className="rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Sana</TableHead><TableHead>Invoice</TableHead><TableHead>Yetkazib beruvchi</TableHead>
              <TableHead>Tovar</TableHead><TableHead className="text-right">Miqdor</TableHead>
              <TableHead className="text-right">Narx</TableHead><TableHead className="text-right">Jami</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {incoming.map(i => {
                const p = products.find(x => x.id === i.productId);
                const s = suppliers.find(x => x.id === i.supplierId);
                return (
                  <TableRow key={i.id} className="hover:bg-muted/40">
                    <TableCell className="text-sm">{new Date(i.date).toLocaleDateString("uz-UZ")}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{i.invoice}</Badge></TableCell>
                    <TableCell className="font-medium">{s?.name}</TableCell>
                    <TableCell>{p?.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.qty}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatSom(i.buyPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatSom(i.buyPrice * i.qty)}</TableCell>
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
