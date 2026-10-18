import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-kit";
import { Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import { EmployeeInfoSection } from "./EmployeeInfoSection";
import { EmployeePaymentsTable } from "./EmployeePaymentsTable";
import { EmployeePaymentDialog } from "./EmployeePaymentDialog";
import { EmployeeEditDialog, type EmployeeEditFormData } from "./EmployeeEditDialog";

interface EmployeeDetailPageProps {
  id: string;
}

export function EmployeeDetailPage({ id }: EmployeeDetailPageProps) {
  const navigate = useNavigate();
  const { employees, updateEmployee } = useStore();

  const employee = employees.find((e) => e.id === id);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"Avans" | "Oylik">("Avans");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EmployeeEditFormData>({
    name: "",
    phone: "",
    role: "",
    salary: 0,
    hireDate: "",
    status: "Faol",
  });

  if (!employee) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Xodim topilmadi"
          subtitle="So'ralgan xodim tizimda mavjud emas yoki o'chirilgan."
          onBack={() => navigate({ to: "/employees" })}
        />
      </div>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const payments = employee.paymentHistory || [];

  const advanceThisMonth = payments
    .filter((p) => p.type === "Avans" && p.date.startsWith(currentMonth))
    .reduce((sum, p) => sum + p.amount, 0);

  const salaryPaidThisMonth = payments
    .filter((p) => p.type === "Oylik" && p.date.startsWith(currentMonth))
    .reduce((sum, p) => sum + p.amount, 0);

  const totalAdvanceAllTime = payments
    .filter((p) => p.type === "Avans")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaidAllTime = payments.reduce((sum, p) => sum + p.amount, 0);

  const remainingThisMonth = Math.max(
    0,
    (employee.salary || 0) - advanceThisMonth - salaryPaidThisMonth,
  );

  const handlePayment = () => {
    if (paymentAmount <= 0) {
      toast.error("Summa 0 dan katta bo'lishi kerak");
      return;
    }

    const newPayment = {
      id: `epay_${Math.random().toString(36).slice(2, 9)}`,
      type: paymentType,
      amount: paymentAmount,
      date: new Date().toISOString(),
      note: paymentNote.trim() || undefined,
    };

    updateEmployee(employee.id, {
      advance: employee.advance + (paymentType === "Avans" ? paymentAmount : 0),
      paymentHistory: [...payments, newPayment],
    });

    toast.success(`${paymentType} muvaffaqiyatli berildi: ${formatSom(paymentAmount)}`);
    setPaymentOpen(false);
    setPaymentAmount(0);
    setPaymentNote("");
  };

  const openEditDialog = () => {
    setEditForm({
      name: employee.name,
      phone: employee.phone,
      role: employee.role,
      salary: employee.salary,
      hireDate: employee.hireDate,
      status: employee.status,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editForm.name) {
      toast.error("Ism majburiy");
      return;
    }
    updateEmployee(employee.id, {
      ...editForm,
      role: editForm.role as "Admin" | "Sotuvchi" | "Omborchi",
    });
    toast.success("Xodim ma'lumotlari yangilandi");
    setEditOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.name}
        subtitle={`${employee.role} • Tel: ${employee.phone || "Kiritilmagan"}`}
        onBack={() => navigate({ to: "/employees" })}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openEditDialog}>
              <Edit className="h-4 w-4 mr-1.5" />
              Tahrirlash
            </Button>
            <Button
              onClick={() => {
                setPaymentType("Avans");
                setPaymentAmount(0);
                setPaymentNote("");
                setPaymentOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              To'lov berish
            </Button>
          </div>
        }
      />

      <EmployeeInfoSection
        employee={employee}
        advanceThisMonth={advanceThisMonth}
        salaryPaidThisMonth={salaryPaidThisMonth}
        remainingThisMonth={remainingThisMonth}
        totalAdvanceAllTime={totalAdvanceAllTime}
        totalPaidAllTime={totalPaidAllTime}
        paymentsCount={payments.length}
      />

      <EmployeePaymentsTable payments={payments} employeeName={employee.name} />

      <EmployeePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        employeeName={employee.name}
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        onSubmit={handlePayment}
      />

      <EmployeeEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
