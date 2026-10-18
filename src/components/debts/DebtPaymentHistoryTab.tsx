import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePagination, PaginationBar } from "@/components/ui-kit";
import { formatSom } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";
import type { DebtPayment } from "@/lib/types";

interface DebtPaymentHistoryTabProps {
  debtPayments: DebtPayment[];
}

export function DebtPaymentHistoryTab({ debtPayments }: DebtPaymentHistoryTabProps) {
  const t = useT();
  const pgHistory = usePagination(debtPayments || [], 50);

  return (
    <Card className="rounded-2xl p-4 card-elevated border-border/60">
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("debts.who")}</TableHead>
              <TableHead>{t("debts.targetType")}</TableHead>
              <TableHead>{t("debts.paymentMethod")}</TableHead>
              <TableHead className="text-right">{t("common.amount")}</TableHead>
              <TableHead>{t("expenses.note")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pgHistory.paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  {t("debts.noPaymentHistory")}
                </TableCell>
              </TableRow>
            ) : (
              pgHistory.paged.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="text-sm font-medium tabular-nums">
                    {new Date(p.date).toLocaleString("uz-UZ")}
                  </TableCell>
                  <TableCell className="font-semibold">{p.targetName}</TableCell>
                  <TableCell>
                    <Badge variant={p.type === "customer" ? "secondary" : "outline"}>
                      {p.type === "customer" ? t("sales.customer") : t("debts.supplierShort")}
                    </Badge>
                  </TableCell>
                  <TableCell>{paymentLabel(t, p.paymentMethod)}</TableCell>
                  <TableCell className="text-right text-success font-bold tabular-nums">
                    {formatSom(p.amount)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-50 truncate">
                    {p.note || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationBar {...pgHistory} />
    </Card>
  );
}
