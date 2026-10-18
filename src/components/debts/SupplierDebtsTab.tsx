import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatSom } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import type { Supplier, Product, IncomingStock } from "@/lib/types";

interface SupplierDebtsTabProps {
  toSuppliers: Supplier[];
  incoming: IncomingStock[];
  products: Product[];
  onOpenSupPay: (id: string, name: string, debt: number) => void;
}

export function SupplierDebtsTab({
  toSuppliers,
  incoming,
  products,
  onOpenSupPay,
}: SupplierDebtsTabProps) {
  const t = useT();

  return (
    <Card className="rounded-2xl p-4 card-elevated border-border/60">
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>{t("common.supplier")}</TableHead>
              <TableHead>{t("common.phone")}</TableHead>
              <TableHead>{t("common.product")}</TableHead>
              <TableHead className="text-right">{t("common.total")}</TableHead>
              <TableHead className="text-right">{t("sales.paidTotal")}</TableHead>
              <TableHead className="text-right">{t("sales.remainingDebt")}</TableHead>
              <TableHead className="text-right pr-4">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {toSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {t("debts.noDebtSuppliers")}
                </TableCell>
              </TableRow>
            ) : (
              toSuppliers.map((s) => {
                const supplierIncoming = incoming.filter((inc) => inc.supplierId === s.id);
                const totalPurchased = supplierIncoming.reduce(
                  (sum, inc) => sum + inc.buyPrice * inc.qty,
                  0,
                );
                const paid = totalPurchased - s.debt;
                const productNames = [
                  ...new Set(
                    supplierIncoming.map(
                      (inc) =>
                        products.find((p) => p.id === inc.productId)?.name ||
                        t("sales.unknownProduct"),
                    ),
                  ),
                ].join(", ");

                return (
                  <TableRow
                    key={s.id}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => onOpenSupPay(s.id, s.name, s.debt)}
                  >
                    <TableCell className="font-semibold">{s.name}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground text-xs">
                      {s.phone}
                    </TableCell>
                    <TableCell className="max-w-44 truncate text-sm">
                      {productNames || "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {totalPurchased > 0 ? formatSom(totalPurchased) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {totalPurchased > 0 ? formatSom(Math.max(0, paid)) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-destructive font-bold tabular-nums">
                      {formatSom(s.debt)}
                    </TableCell>
                    <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" onClick={() => onOpenSupPay(s.id, s.name, s.debt)}>
                        {t("debts.payDebt")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
