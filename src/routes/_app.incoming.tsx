import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, useConfirm, usePagination, PaginationBar, useSelection, BulkBar, SelectCell } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

export const Route = createFileRoute("/_app/incoming")({ component: IncomingPage });

function IncomingPage() {
  const { incoming, products, suppliers, deleteIncoming } = useStore();
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();
  const sorted = useMemo(() => [...incoming].sort((a, b) => +new Date(b.date) - +new Date(a.date)), [incoming]);
  const pg = usePagination(sorted, 12);
  const pageIds = pg.paged.map(p => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => sel.has(id));

  const removeOne = async (id: string) => {
    const ok = await confirm({ title: "Kirimni o'chirish", description: "Kirim o'chiriladi va tovar miqdori kamayadi. Davom etilsinmi?", destructive: true, confirmText: "O'chirish" });
    if (ok) { deleteIncoming(id); toast.success("O'chirildi"); }
  };
  const removeBulk = async () => {
    const ok = await confirm({ title: "Tanlanganlarni o'chirish", description: `${sel.count} ta kirim o'chiriladi va mos tovar miqdorlari kamayadi.`, destructive: true, confirmText: "O'chirish" });
    if (!ok) return;
    const n = sel.count;
    sel.selected.forEach(id => deleteIncoming(id));
    sel.clear(); toast.success(`${n} ta kirim o'chirildi`);
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader title="Kirimlar" subtitle={`${incoming.length} ta kirim yozuvi`} />
      <Card className="rounded-2xl p-3 md:p-4">
        <BulkBar count={sel.count} onDelete={removeBulk} onClear={sel.clear} label="kirim tanlandi" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)} /></TableHead>
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
              {pg.paged.map(i => {
                const p = products.find(x => x.id === i.productId);
                const s = suppliers.find(x => x.id === i.supplierId);
                return (
                  <TableRow key={i.id} className="hover:bg-muted/40" data-state={sel.has(i.id) ? "selected" : undefined}>
                    <TableCell><SelectCell checked={sel.has(i.id)} onChange={() => sel.toggle(i.id)} /></TableCell>
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
                      <Button variant="ghost" size="icon" onClick={() => removeOne(i.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <PaginationBar {...pg} />
      </Card>
    </div>
  );
}
