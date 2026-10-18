import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  useConfirm,
  useSelection,
  useSortableData,
  exportToCSV,
  exportToExcel,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { CustomerFormDialog, type CustomerFormData } from "./CustomerFormDialog";
import { CustomerPaymentDialog } from "./CustomerPaymentDialog";
import { CustomersTable } from "./CustomersTable";
import type { Customer } from "@/lib/types";

const emptyForm = (firstBrand: string): CustomerFormData => ({
  name: "",
  phone: "",
  address: "",
  vehicle: firstBrand,
});

export function CustomersPage() {
  const { customers, vehicleBrands, addCustomer, updateCustomer, deleteCustomer, addDebtPayment } =
    useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormData>(emptyForm(vehicleBrands[0] || ""));
  const [search, setSearch] = useState("");
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentCustomerId, setPaymentCustomerId] = useState("");
  const [paymentCustomerName, setPaymentCustomerName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"Naqd" | "Karta">("Naqd");
  const [paymentNote, setPaymentNote] = useState("");

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return customers.filter((c) => !s || c.name.toLowerCase().includes(s) || c.phone.includes(s));
  }, [customers, search]);

  // Sorting
  const { items: sortedCustomers, sortConfig, requestSort } = useSortableData<Customer>(filtered);

  const startEdit = (id: string) => {
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setEditing(id);
    setForm({ name: c.name, phone: c.phone, address: c.address, vehicle: c.vehicle });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name) {
      toast.error(t("crm.required.name"));
      return;
    }
    if (vehicleBrands.length === 0) {
      toast.error(t("crm.brandRequired"));
      return;
    }
    const vehicle = vehicleBrands.includes(form.vehicle) ? form.vehicle : vehicleBrands[0];
    if (editing) {
      updateCustomer(editing, { ...form, vehicle });
      toast.success(t("crm.updated"));
    } else {
      addCustomer({
        id: `cust_${Math.random().toString(36).slice(2, 9)}`,
        ...form,
        vehicle,
        totalPurchases: 0,
        debt: 0,
      });
      toast.success(t("crm.created"));
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyForm(vehicleBrands[0] || ""));
  };

  const removeOne = async (id: string, name: string) => {
    const ok = await confirm({
      title: `${name}`,
      description: t("common.delete") + "?",
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    const snapshot = customers.find((c) => c.id === id);
    deleteCustomer(id);
    toast.success(t("crm.deleted_one") + `: ${name}`, {
      action: snapshot ? { label: t("crm.undo"), onClick: () => addCustomer(snapshot) } : undefined,
    });
  };

  const removeBulk = async () => {
    const ok = await confirm({
      title: `${sel.count} ${t("crm.bulk.label")}`,
      description: t("common.delete") + "?",
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    const snapshots = customers.filter((c) => sel.has(c.id));
    const names = snapshots.map((s) => s.name);
    snapshots.forEach((s) => deleteCustomer(s.id));
    sel.clear();
    toast.success(`${snapshots.length} ${t("crm.deleted")}`, {
      description: names.slice(0, 5).join(", ") + (names.length > 5 ? "…" : ""),
      action: { label: t("crm.undo"), onClick: () => snapshots.forEach((s) => addCustomer(s)) },
    });
  };

  const handleOpenPayment = (customerId: string, customerName: string, debt: number) => {
    setPaymentCustomerId(customerId);
    setPaymentCustomerName(customerName);
    setPaymentAmount(debt);
    setPaymentMethod("Naqd");
    setPaymentNote("");
    setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = () => {
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error(t("debts.amountInvalid"));
      return;
    }
    const customer = customers.find((c) => c.id === paymentCustomerId);
    if (!customer || paymentAmount > customer.debt) {
      toast.error(t("debts.amountTooMuch"));
      return;
    }

    addDebtPayment({
      id: `pay_${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
      type: "customer",
      targetId: paymentCustomerId,
      targetName: paymentCustomerName,
      amount: paymentAmount,
      paymentMethod: paymentMethod,
      note: paymentNote,
    });

    toast.success(t("debts.paymentRecorded"));
    setPaymentDialogOpen(false);
    setPaymentAmount(0);
    setPaymentNote("");
  };

  const exportHeaders = () => [
    { label: t("crm.name"), key: "name" },
    { label: t("common.phone"), key: "phone" },
    { label: t("common.address"), key: "address" },
    { label: t("crm.vehicle"), key: "vehicle" },
    { label: t("crm.exportPurchases"), key: "totalPurchases" },
    { label: t("crm.exportDebt"), key: "debt" },
  ];

  const handleExportCSV = () => {
    const headers = exportHeaders();
    exportToCSV(filtered, headers, `mijozlar_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportExcel = () => {
    const headers = exportHeaders();
    exportToExcel(
      filtered,
      headers,
      t("crm.exportTitle"),
      `mijozlar_${new Date().toISOString().slice(0, 10)}.xls`,
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {confirmNode}
      <PageHeader
        title={t("crm.title")}
        subtitle={`${customers.length} ${t("crm.count")}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm(vehicleBrands[0] || ""));
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("crm.new")}
            </Button>
          </>
        }
      />

      <CustomersTable
        customers={sortedCustomers}
        search={search}
        setSearch={setSearch}
        sel={sel}
        sortConfig={sortConfig}
        requestSort={requestSort}
        onOpenPayment={handleOpenPayment}
        onEdit={startEdit}
        onDeleteOne={removeOne}
        onDeleteBulk={removeBulk}
      />

      <CustomerFormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setForm(emptyForm(vehicleBrands[0] || ""));
          }
        }}
        editing={editing}
        form={form}
        setForm={setForm}
        vehicleBrands={vehicleBrands}
        onSubmit={submit}
      />

      <CustomerPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customerName={paymentCustomerName}
        customerDebt={customers.find((c) => c.id === paymentCustomerId)?.debt || 0}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        onSubmit={handleSubmitPayment}
      />
    </div>
  );
}
