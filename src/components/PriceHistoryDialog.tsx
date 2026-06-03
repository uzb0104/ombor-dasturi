import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from "lucide-react";
import { useT } from "@/lib/i18n";
import { productsApi } from "@/lib/api";
import { formatSom } from "@/lib/constants";
import type { Product } from "@/lib/mock-data";

type PriceHistoryRow = {
  id: string;
  field: "buy_price" | "sell_price";
  oldValue: number | null;
  newValue: number;
  changedByName: string;
  createdAt: string;
};

export function PriceHistoryDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const [rows, setRows] = useState<PriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setLoading(true);
    productsApi
      .priceHistory(product.id)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open, product?.id]);

  const fieldLabel = (f: string) =>
    f === "buy_price" ? t("products.history.field.buy") : t("products.history.field.sell");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("products.priceHistory")}: {product?.name}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("products.history.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("products.history.when")}</TableHead>
                <TableHead>{t("products.history.type")}</TableHead>
                <TableHead className="text-right">{t("products.history.old")}</TableHead>
                <TableHead className="text-right">{t("products.history.new")}</TableHead>
                <TableHead>{t("products.history.by")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("uz-UZ")}
                  </TableCell>
                  <TableCell>{fieldLabel(r.field)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.oldValue != null ? formatSom(r.oldValue) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatSom(r.newValue)}
                  </TableCell>
                  <TableCell className="text-xs">{r.changedByName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
