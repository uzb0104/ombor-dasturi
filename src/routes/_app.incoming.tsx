import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/incoming")({ component: IncomingPage });

function IncomingPage() {
  const { incoming, products, suppliers, deleteIncoming } = useStore();
  return (
    <div className="space-y-5">
      <PageHeader title="Kirimlar" subtitle={`${incoming.length} ta kirim yozuvi`} />
      <Card className="rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Sana</TableHead>
              <TableHead className="hidden sm:table-cell">Invoice</TableHead>
              <TableHead className="hidden md:table-cell">Yetkazib beruvchi</TableHead>
              <TableHead>Tovar</TableHead>
              <TableHead className="text-right">Miqdor</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Narx</TableHead>
              <TableHead className="text-right">Jami</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {incoming.map(i => {
                const p = products.find(x => x.id === i.productId);
                const s = suppliers.find(x => x.id === i.supplierId);
                return (
                  <TableRow key={i.id} className="hover:bg-muted/40">
                    <TableCell className="text-sm">{new Date(i.date).toLocaleDateString("uz-UZ")}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="font-mono text-xs">{i.invoice}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell font-medium">{s?.name}</TableCell>
                    <TableCell>{p?.name}
                      <div className="md:hidden text-xs text-muted-foreground">{s?.name}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{i.qty}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums text-sm">{formatSom(i.buyPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatSom(i.buyPrice * i.qty)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Kirimni o'chirish? Tovar miqdori kamayadi.")) { deleteIncoming(i.id); toast.success("O'chirildi"); } }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
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
