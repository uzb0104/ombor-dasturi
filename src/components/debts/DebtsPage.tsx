import { useState, useMemo } from "react";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { CustomerDebtsTab } from "./CustomerDebtsTab";
import { CustomerDebtPayDialog } from "./CustomerDebtPayDialog";

export function DebtsPage() {
  const t = useT();
  const { sales, customers, products, addDebtPayment, updateSale } = useStore();

  // === Mijozlardan qarzlar (sotuvdan) ===
  const debtSales = useMemo(
    () => sales.filter((s) => s.paymentType === "Qarz" && s.total - (s.paid || 0) > 0),
    [sales],
  );

  const totalIn = useMemo(
    () => debtSales.reduce((sum, s) => sum + (s.total - (s.paid || 0)), 0),
    [debtSales],
  );

  // === To'lov dialog (sotuv qarzini to'lash) ===
  const [payDialog, setPayDialog] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [selectedSaleTotal, setSelectedSaleTotal] = useState(0);
  const [selectedSalePaid, setSelectedSalePaid] = useState(0);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<"Naqd" | "Karta">("Naqd");
  const [payNote, setPayNote] = useState("");

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

  const selectedSale = sales.find((s) => s.id === selectedSaleId);
  const selectedCustomer = selectedSale
    ? customers.find((c) => c.id === selectedSale.customerId)
    : undefined;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader showBack={false} title={t("debts.title")} subtitle={t("debts.subtitle")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label={t("debts.owedToUs")}
          value={formatSom(totalIn)}
          icon={ArrowDownCircle}
          accent="success"
        />
      </div>

      <CustomerDebtsTab
        debtSales={debtSales}
        customers={customers}
        products={products}
        onOpenSalePay={handleOpenSalePay}
      />

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
    </div>
  );
}
