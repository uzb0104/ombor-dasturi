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
import { usePagination, PaginationBar } from "@/components/ui-kit";
import { formatSom, formatDate } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import type { Sale, Customer, Product } from "@/lib/types";

interface CustomerDebtsTabProps {
  debtSales: Sale[];
  customers: Customer[];
  products: Product[];
  onOpenSalePay: (saleId: string, total: number, paid: number) => void;
}

export function CustomerDebtsTab({
  debtSales,
  customers,
  products,
  onOpenSalePay,
}: CustomerDebtsTabProps) {
  const t = useT();
  const pgDebtSales = usePagination(debtSales, 50);

  return (
    <Card className="rounded-2xl p-4 card-elevated border-border/60">
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("sales.customer")}</TableHead>
              <TableHead>{t("common.phone")}</TableHead>
              <TableHead>{t("common.product")}</TableHead>
              <TableHead className="text-right">{t("products.qty")}</TableHead>
              <TableHead className="text-right">{t("common.total")}</TableHead>
              <TableHead className="text-right">{t("sales.paidTotal")}</TableHead>
              <TableHead className="text-right">{t("sales.remainingDebt")}</TableHead>
              <TableHead className="text-right pr-4">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pgDebtSales.paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  {t("debts.noDebtCustomers")}
                </TableCell>
              </TableRow>
            ) : (
              pgDebtSales.paged.map((sale) => {
                const customer = customers.find((c) => c.id === sale.customerId);
                const paid = sale.paid || 0;
                const remaining = sale.total - paid;
                const productNames = sale.items
                  .map(
                    (item) =>
                      products.find((p) => p.id === item.productId)?.name ||
                      item.productName ||
                      t("sales.unknownProduct"),
                  )
                  .join(", ");
                const totalQty = sale.items.reduce((sum, item) => sum + item.qty, 0);

                return (
                  <TableRow
                    key={sale.id}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => onOpenSalePay(sale.id, sale.total, paid)}
                  >
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">
                      {formatDate(sale.date)}
                    </TableCell>
                    <TableCell className="font-semibold">{customer?.name || "—"}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground text-xs">
                      {customer?.phone || "—"}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">{productNames}</TableCell>
                    <TableCell className="text-right tabular-nums">{totalQty}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatSom(sale.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatSom(paid)}
                    </TableCell>
                    <TableCell className="text-right text-destructive font-bold tabular-nums">
                      {formatSom(remaining)}
                    </TableCell>
                    <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" onClick={() => onOpenSalePay(sale.id, sale.total, paid)}>
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
      <PaginationBar {...pgDebtSales} />
    </Card>
  );
}
