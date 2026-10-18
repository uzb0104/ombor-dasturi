import { useState, useMemo } from "react";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { CustomerDebtsTab } from "./CustomerDebtsTab";
import { SupplierDebtsTab } from "./SupplierDebtsTab";
import { DebtPaymentHistoryTab } from "./DebtPaymentHistoryTab";
import { CustomerDebtPayDialog } from "./CustomerDebtPayDialog";
import { SupplierDebtPayDialog } from "./SupplierDebtPayDialog";

export function DebtsPage() {
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

  const selectedSale = sales.find((s) => s.id === selectedSaleId);
  const selectedCustomer = selectedSale
    ? customers.find((c) => c.id === selectedSale.customerId)
    : undefined;

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
            <span>{t("debts.tab.historyCount", { n: (debtPayments || []).length })}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in" className="space-y-4">
          <CustomerDebtsTab
            debtSales={debtSales}
            customers={customers}
            products={products}
            onOpenSalePay={handleOpenSalePay}
          />
        </TabsContent>

        <TabsContent value="out" className="space-y-4">
          <SupplierDebtsTab
            toSuppliers={toSuppliers}
            incoming={incoming}
            products={products}
            onOpenSupPay={handleOpenSupPay}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <DebtPaymentHistoryTab debtPayments={debtPayments || []} />
        </TabsContent>
      </Tabs>

      <CustomerDebtPayDialog
        open={payDialog}
        onOpenChange={setPayDialog}
        sale={selectedSale}
        customer={selectedCustomer}
        selectedSaleTotal={selectedSaleTotal}
        selectedSalePaid={selectedSalePaid}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        payNote={payNote}
        setPayNote={setPayNote}
        onSubmit={handleSalePay}
      />

      <SupplierDebtPayDialog
        open={supPayDialog}
        onOpenChange={setSupPayDialog}
        targetName={supTargetName}
        maxDebt={supMaxDebt}
        amount={supAmount}
        setAmount={setSupAmount}
        payMethod={supPayMethod}
        setPayMethod={setSupPayMethod}
        note={supNote}
        setNote={setSupNote}
        onSubmit={handleSupPay}
      />
    </div>
  );
}
