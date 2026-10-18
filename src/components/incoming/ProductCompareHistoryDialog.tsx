import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MapPin } from "lucide-react";
import { formatSom, formatDate } from "@/lib/constants";
import type { IncomingStock, Product } from "@/lib/types";

interface ProductCompareHistoryDialogProps {
  product: Product | null;
  onClose: () => void;
  incoming: IncomingStock[];
  isRu: boolean;
}

export function ProductCompareHistoryDialog({
  product,
  onClose,
  incoming,
  isRu,
}: ProductCompareHistoryDialogProps) {
  if (!product) return null;

  const productIncomings = incoming
    .filter((i) => i.productId === product.id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <Dialog open={Boolean(product)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl bg-card border rounded-2xl shadow-elevated p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-emerald-500" />
            <span>{product.name}</span>
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
            <span>🚗 {product.vehicle || "Universal"}</span>
            {product.sku && <span>· #{product.sku}</span>}
            <span>· Omborda: {product.quantity} dona</span>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            {isRu
              ? "История всех поставок по регионам:"
              : "Viloyatlar bo'yicha barcha xaridlar tarixi:"}
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Sana</TableHead>
                  <TableHead>{isRu ? "Регион" : "Viloyat"}</TableHead>
                  <TableHead className="text-right">Miqdor</TableHead>
                  <TableHead className="text-right">Narxi</TableHead>
                  <TableHead className="text-right pr-4">Jami</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productIncomings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-6 text-xs text-muted-foreground"
                    >
                      Ushbu tovar bo'yicha kirimlar tarixi topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  productIncomings.map((inc) => {
                    return (
                      <TableRow key={inc.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono">{formatDate(inc.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1 text-primary" />
                            {inc.region || (isRu ? "Без региона" : "Ko'rsatilmagan")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{inc.qty}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatSom(inc.buyPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold pr-4">
                          {formatSom(inc.buyPrice * inc.qty)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="mt-3">
          <Button onClick={onClose}>{isRu ? "Закрыть" : "Yopish"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
