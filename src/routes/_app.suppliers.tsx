import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/suppliers")({ component: SuppliersPage });

function SuppliersPage() {
  const { suppliers, products } = useStore();
  return (
    <div className="space-y-5">
      <PageHeader title="Yetkazib beruvchilar" subtitle={`${suppliers.length} ta yetkazib beruvchi`} />
      <Card className="rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nomi</TableHead><TableHead>Telefon</TableHead><TableHead>Manzil</TableHead>
              <TableHead className="text-right">Tovarlar</TableHead><TableHead className="text-right">Qarz</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {suppliers.map(s => (
                <TableRow key={s.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm"><Phone className="h-3 w-3 inline mr-1 opacity-60" />{s.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1 opacity-60" />{s.address}</TableCell>
                  <TableCell className="text-right tabular-nums">{products.filter(p => p.supplierId === s.id).length}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.debt > 0 ? <span className="text-destructive font-semibold">{formatSom(s.debt)}</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
