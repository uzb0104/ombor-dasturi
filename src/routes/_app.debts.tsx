import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard, usePagination, PaginationBar } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { ArrowDownCircle, ArrowUpCircle, History, Wallet, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/debts")({ component: DebtsPage });

function DebtsPage() {
  const t = useT();
  const {
    sales,
    customers,
    products,
    suppliers,
    incoming,
    debtPayments,
    addDebtPayment,
    updateSale,
  } = useStore();

  // === Mijozlardan qarzlar (sotuvdan) ===
  const debtSales = useMemo(
    () => sales.filter((s) => s.paymentType === "Qarz" && s.total - (s.paid || 0) > 0),
    [sales],
  );

  // === Yetkazuvchilarga qarzlar ===
  const toSuppliers = suppliers.filter((s) => s.debt > 0);

  const totalIn = useMemo(
    () => debtSales.reduce((sum, s) => sum + (s.total - (s.paid || 0)), 0),
    [debtSales],
  );
  const totalOut = toSuppliers.reduce((a, s) => a + s.debt, 0);

  // === To'lov dialog (sotuv qarzini to'lash) ===
  const [payDialog, setPayDialog] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [selectedSaleTotal, setSelectedSaleTotal] = useState(0);
  const [selectedSalePaid, setSelectedSalePaid] = useState(0);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<"Naqd" | "Karta">("Naqd");
  const [payNote, setPayNote] = useState("");

  // === Yetkazuvchi to'lov dialog ===
  const [supPayDialog, setSupPayDialog] = useState(false);
  const [supTargetId, setSupTargetId] = useState("");
  const [supTargetName, setSupTargetName] = useState("");
  const [supMaxDebt, setSupMaxDebt] = useState(0);
  const [supAmount, setSupAmount] = useState(0);
  const [supPayMethod, setSupPayMethod] = useState<"Naqd" | "Karta">("Naqd");
  const [supNote, setSupNote] = useState("");

  // Pagination
  const historyList = debtPayments || [];
  const pgHistory = usePagination(historyList, 10);
  const pgDebtSales = usePagination(debtSales, 10);

  const handleOpenSalePay = (saleId: string, total: number, paid: number) => {
    setSelectedSaleId(saleId);
    setSelectedSaleTotal(total);
    setSelectedSalePaid(paid);
    setPayAmount(total - paid);
    setPayMethod("Naqd");
    setPayNote("");
    setPayDialog(true);
  };

  const handleSalePay = () => {
    const sale = sales.find((s) => s.id === selectedSaleId);
    if (!sale) return;
    const remaining = selectedSaleTotal - selectedSalePaid;
    if (payAmount <= 0 || payAmount > remaining) {
      toast.error(t("debts.amountInvalid"));
      return;
    }

    const customer = customers.find((c) => c.id === sale.customerId);
    const newPaid = selectedSalePaid + payAmount;

    updateSale(selectedSaleId, { paid: newPaid });

    addDebtPayment({
      id: `pay_${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
      type: "customer",
      targetId: sale.customerId || "",
      targetName: customer?.name || "—",
      amount: payAmount,
      paymentMethod: payMethod,
      note: payNote.trim() || undefined,
    });

    toast.success(t("debts.paymentSuccess"));
    setPayDialog(false);
  };

  const handleOpenSupPay = (id: string, name: string, debt: number) => {
    setSupTargetId(id);
    setSupTargetName(name);
    setSupMaxDebt(debt);
    setSupAmount(debt);
    setSupPayMethod("Naqd");
    setSupNote("");
    setSupPayDialog(true);
  };

  const handleSupPay = () => {
    if (supAmount <= 0) {
      toast.error(t("debts.amountInvalid"));
      return;
    }
    if (supAmount > supMaxDebt) {
      toast.error(t("debts.amountTooMuch"));
      return;
    }

    addDebtPayment({
      id: `pay_${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
      type: "supplier",
      targetId: supTargetId,
      targetName: supTargetName,
      amount: supAmount,
      paymentMethod: supPayMethod,
      note: supNote.trim() || undefined,
    });

    toast.success(t("debts.paymentSuccess"));
    setSupPayDialog(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title={t("debts.title")} subtitle={t("debts.subtitle")} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          label={t("debts.owedToUs")}
          value={formatSom(totalIn)}
          icon={ArrowDownCircle}
          accent="success"
        />
        <StatCard
          label={t("debts.weOwe")}
          value={formatSom(totalOut)}
          icon={ArrowUpCircle}
          accent="destructive"
        />
      </div>

      {/* Mijoz qarzini to'lash dialogi */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-md bg-card border rounded-2xl shadow-elevated p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> {t("debts.payTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(() => {
              const sale = sales.find((s) => s.id === selectedSaleId);
              const customer = sale ? customers.find((c) => c.id === sale.customerId) : null;
              const remaining = selectedSaleTotal - selectedSalePaid;
              return (
                <div className="bg-muted/40 p-3.5 rounded-xl border border-border/40 space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">
                    {t("sales.customer")}
                  </div>
                  <div className="font-bold text-base text-foreground">{customer?.name || "—"}</div>
                  {customer?.phone && (
                    <div className="text-xs text-muted-foreground">{customer.phone}</div>
                  )}
                  <div className="flex justify-between text-xs pt-1.5 border-t border-border/60">
                    <span className="text-muted-foreground">{t("debts.totalDebt")}</span>
                    <span className="font-bold text-destructive tabular-nums">
                      {formatSom(remaining)}
                    </span>
                  </div>
                </div>
              );
            })()}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("debts.paymentAmount")} *
              </Label>
              <Input
                type="number"
                className="mt-1"
                max={selectedSaleTotal - selectedSalePaid}
                value={payAmount}
                onChange={(e) =>
                  setPayAmount(
                    Math.min(selectedSaleTotal - selectedSalePaid, Math.max(0, +e.target.value)),
                  )
                }
              />
              <div className="mt-1 flex justify-end gap-1.5">
                <button
                  onClick={() =>
                    setPayAmount(Math.round((selectedSaleTotal - selectedSalePaid) / 2))
                  }
                  className="text-[10px] bg-muted hover:bg-muted/80 px-2 py-0.5 rounded border font-medium"
                >
                  50%
                </button>
                <button
                  onClick={() => setPayAmount(selectedSaleTotal - selectedSalePaid)}
                  className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/20 font-medium"
                >
                  {t("debts.allAmount")}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("sales.payment")}
                </Label>
                <Select
                  value={payMethod}
                  onValueChange={(v) => setPayMethod(v as "Naqd" | "Karta")}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Naqd">{paymentLabel(t, "Naqd")}</SelectItem>
                    <SelectItem value="Karta">{paymentLabel(t, "Karta")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("debts.remainingDebt")}
                </Label>
                <div className="h-9 border rounded-md px-3 bg-muted/20 flex items-center mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {formatSom(selectedSaleTotal - selectedSalePaid - payAmount)}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("expenses.note")}
              </Label>
              <Input
                placeholder={t("debts.notePh")}
                className="mt-1"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setPayDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSalePay} disabled={payAmount <= 0}>
              <Check className="h-4 w-4 mr-1" />
              {t("debts.confirmPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yetkazuvchi qarzini to'lash dialogi */}
      <Dialog open={supPayDialog} onOpenChange={setSupPayDialog}>
        <DialogContent className="max-w-md bg-card border rounded-2xl shadow-elevated p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> {t("debts.payTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/40 p-3.5 rounded-xl border border-border/40 space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-semibold">
                {t("common.supplier")}
              </div>
              <div className="font-bold text-base text-foreground">{supTargetName}</div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-border/60">
                <span className="text-muted-foreground">{t("debts.totalDebt")}</span>
                <span className="font-bold text-destructive tabular-nums">
                  {formatSom(supMaxDebt)}
                </span>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("debts.paymentAmount")} *
              </Label>
              <Input
                type="number"
                className="mt-1"
                max={supMaxDebt}
                value={supAmount}
                onChange={(e) => setSupAmount(Math.min(supMaxDebt, Math.max(0, +e.target.value)))}
              />
              <div className="mt-1 flex justify-end gap-1.5">
                <button
                  onClick={() => setSupAmount(Math.round(supMaxDebt / 2))}
                  className="text-[10px] bg-muted hover:bg-muted/80 px-2 py-0.5 rounded border font-medium"
                >
                  50%
                </button>
                <button
                  onClick={() => setSupAmount(supMaxDebt)}
                  className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/20 font-medium"
                >
                  {t("debts.allAmount")}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("sales.payment")}
                </Label>
                <Select
                  value={supPayMethod}
                  onValueChange={(v) => setSupPayMethod(v as "Naqd" | "Karta")}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Naqd">{paymentLabel(t, "Naqd")}</SelectItem>
                    <SelectItem value="Karta">{paymentLabel(t, "Karta")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("debts.remainingDebt")}
                </Label>
                <div className="h-9 border rounded-md px-3 bg-muted/20 flex items-center mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {formatSom(supMaxDebt - supAmount)}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("expenses.note")}
              </Label>
              <Input
                placeholder={t("debts.notePh")}
                className="mt-1"
                value={supNote}
                onChange={(e) => setSupNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setSupPayDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSupPay} disabled={supAmount <= 0}>
              <Check className="h-4 w-4 mr-1" />
              {t("debts.confirmPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="in" className="space-y-4">
        <TabsList>
          <TabsTrigger value="in" className="flex items-center gap-1.5">
            <ArrowDownCircle className="h-4 w-4 text-success" />
            <span>{t("debts.tab.inCount", { n: debtSales.length })}</span>
          </TabsTrigger>
          <TabsTrigger value="out" className="flex items-center gap-1.5">
            <ArrowUpCircle className="h-4 w-4 text-destructive" />
            <span>{t("debts.tab.outCount", { n: toSuppliers.length })}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="h-4 w-4 text-primary" />
            <span>{t("debts.tab.historyCount", { n: historyList.length })}</span>
          </TabsTrigger>
        </TabsList>

        {/* === MIJOZLAR QARZLARI (Sotuvdan) === */}
        <TabsContent value="in" className="space-y-4">
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
                          onClick={() => handleOpenSalePay(sale.id, sale.total, paid)}
                        >
                          <TableCell className="text-sm tabular-nums whitespace-nowrap">
                            {new Date(sale.date).toLocaleDateString("uz-UZ")}
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
                          <TableCell
                            className="text-right pr-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              onClick={() => handleOpenSalePay(sale.id, sale.total, paid)}
                            >
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
        </TabsContent>

        {/* === YETKAZUVCHILARGA QARZLAR === */}
        <TabsContent value="out" className="space-y-4">
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
                      // Bu yetkazuvchidan olingan barcha kirimlar
                      const supplierIncoming = incoming.filter((inc) => inc.supplierId === s.id);
                      const totalPurchased = supplierIncoming.reduce(
                        (sum, inc) => sum + inc.buyPrice * inc.qty,
                        0,
                      );
                      const paid = totalPurchased - s.debt;
                      // Tovar nomlari
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
                          onClick={() => handleOpenSupPay(s.id, s.name, s.debt)}
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
                          <TableCell
                            className="text-right pr-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              onClick={() => handleOpenSupPay(s.id, s.name, s.debt)}
                            >
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
        </TabsContent>

        {/* === TO'LOV TARIXI === */}
        <TabsContent value="history" className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
