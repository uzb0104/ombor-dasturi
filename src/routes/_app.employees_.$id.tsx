import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { formatSom, ROLES } from "@/lib/constants";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PageHeader,
  StatCard,
  usePagination,
  PaginationBar,
  exportToExcel,
} from "@/components/ui-kit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  User,
  Phone,
  Briefcase,
  Calendar,
  CalendarDays,
  Wallet,
  TrendingDown,
  HandCoins,
  DollarSign,
  Plus,
  Edit,
  Download,
  Search,
  History,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/employees_/$id")({
  component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { employees, updateEmployee } = useStore();

  const employee = employees.find((e) => e.id === id);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"Avans" | "Oylik">("Avans");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    role: "",
    salary: 0,
    hireDate: "",
    status: "Faol" as "Faol" | "Nofaol",
  });

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "Avans" | "Oylik">("ALL");

  // Date Filter States
  const [dateMode, setDateMode] = useState<"ALL" | "DAY" | "MONTH" | "YEAR" | "RANGE">("ALL");
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const matchesDate = (paymentDateIso: string) => {
    if (dateMode === "ALL") return true;
    const dateObj = new Date(paymentDateIso);
    const pDateStr = dateObj.toISOString().slice(0, 10);
    const pMonthStr = dateObj.toISOString().slice(0, 7);
    const pYearStr = dateObj.getFullYear().toString();

    if (dateMode === "DAY") {
      return pDateStr === selectedDay;
    }
    if (dateMode === "MONTH") {
      return pMonthStr === selectedMonth;
    }
    if (dateMode === "YEAR") {
      return pYearStr === selectedYear;
    }
    if (dateMode === "RANGE") {
      if (startDate && pDateStr < startDate) return false;
      if (endDate && pDateStr > endDate) return false;
      return true;
    }
    return true;
  };

  const getDateFilterLabel = () => {
    if (dateMode === "ALL") return "Sana bo'yicha";
    if (dateMode === "DAY") return `Kun: ${selectedDay}`;
    if (dateMode === "MONTH") return `Oy: ${selectedMonth}`;
    if (dateMode === "YEAR") return `Yil: ${selectedYear}`;
    if (dateMode === "RANGE") {
      if (startDate && endDate) return `${startDate} — ${endDate}`;
      if (startDate) return `${startDate} dan`;
      if (endDate) return `${endDate} gacha`;
      return "Davr bo'yicha";
    }
    return "Sana";
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const payments = employee?.paymentHistory || [];

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
    (employee?.salary || 0) - advanceThisMonth - salaryPaidThisMonth,
  );

  // Filter payments
  const sortedPayments = [...payments].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const filteredPayments = sortedPayments.filter((p) => {
    const matchesFilter = filterType === "ALL" || p.type === filterType;
    const dateStr = new Date(p.date).toLocaleString("uz-UZ");
    const amountStr = p.amount.toString();
    const noteStr = (p as { note?: string }).note || "";
    const matchesSearch =
      dateStr.toLowerCase().includes(search.toLowerCase()) ||
      amountStr.includes(search) ||
      noteStr.toLowerCase().includes(search.toLowerCase());

    const matchesDateFilter = matchesDate(p.date);

    return matchesFilter && matchesSearch && matchesDateFilter;
  });

  const pg = usePagination(filteredPayments, 10);

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

  const handleExportExcel = () => {
    const rows = filteredPayments.map((p, idx) => {
      const dt = new Date(p.date);
      return {
        index: idx + 1,
        date: dt.toLocaleDateString("uz-UZ"),
        time: dt.toLocaleTimeString("uz-UZ"),
        type: p.type,
        amount: p.amount,
        note: (p as { note?: string }).note || "—",
      };
    });

    exportToExcel(
      rows,
      [
        { label: "№", key: "index" },
        { label: "Sana", key: "date" },
        { label: "Vaqt", key: "time" },
        { label: "To'lov turi", key: "type" },
        { label: "Summa (so'm)", key: "amount" },
        { label: "Izoh", key: "note" },
      ],
      `${employee.name} - To'lovlar tarixi`,
      `xodim_${employee.name}_tarix.xls`,
    );
    toast.success("Excel yuklab olindi");
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Belgilangan oylik"
          value={formatSom(employee.salary)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="Shu oygi avans"
          value={formatSom(advanceThisMonth)}
          icon={TrendingDown}
          accent="warning"
        />
        <StatCard
          label="Shu oygi oylik to'lovi"
          value={formatSom(salaryPaidThisMonth)}
          icon={HandCoins}
          accent="success"
        />
        <StatCard
          label="Qoldiq to'lov (shu oy)"
          value={formatSom(remainingThisMonth)}
          icon={DollarSign}
          accent="info"
        />
      </div>

      {/* Employee Info Card & Summary */}
      <Card className="rounded-2xl p-5 border-border/60">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Xodim haqida ma'lumot
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" /> F.I.SH
            </div>
            <div className="font-semibold text-base">{employee.name}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Phone className="h-3.5 w-3.5" /> Telefon raqami
            </div>
            <div className="font-medium">{employee.phone || "—"}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" /> Lavozim
            </div>
            <div>
              <Badge variant="secondary" className="font-medium">
                {employee.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" /> Ishga kirgan sana
            </div>
            <div className="font-medium">{employee.hireDate || "—"}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">Holati</div>
            <div>
              {employee.status === "Faol" ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-none">
                  <CheckCircle className="h-3 w-3 mr-1" /> Faol
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground">
                  <XCircle className="h-3 w-3 mr-1" /> Nofaol
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              Jami berilgan avanslar (Barcha davr)
            </div>
            <div className="font-semibold text-amber-600 dark:text-amber-400">
              {formatSom(totalAdvanceAllTime)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              Jami to'lovlar (Oylik + Avans)
            </div>
            <div className="font-semibold text-primary">{formatSom(totalPaidAllTime)}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              Barcha o'zgarishlar va to'lovlar soni
            </div>
            <div className="font-medium">{payments.length} ta yozuv</div>
          </div>
        </div>
      </Card>

      {/* History Table Card */}
      <Card className="rounded-2xl p-4 sm:p-5 border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              O'zgarishlar va to'lovlar tarixi
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Xodimga berilgan barcha avans, oylik to'lovlari va sanalari vaqti bilan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as "ALL" | "Avans" | "Oylik")}
            >
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="To'lov turi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Barcha turlar</SelectItem>
                <SelectItem value="Avans">Faqat Avans</SelectItem>
                <SelectItem value="Oylik">Faqat Oylik</SelectItem>
              </SelectContent>
            </Select>

            {/* Calendar Date Filter Popover */}
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={dateMode !== "ALL" ? "default" : "outline"}
                  size="sm"
                  className="h-9 text-xs flex items-center gap-1.5"
                >
                  <Calendar className="h-4 w-4" />
                  <span>{getDateFilterLabel()}</span>
                  {dateMode !== "ALL" && (
                    <span
                      className="ml-1 hover:text-destructive p-0.5 rounded-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateMode("ALL");
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 space-y-4" align="end">
                <div className="font-semibold text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Sana bo'yicha saralash
                  </span>
                  {dateMode !== "ALL" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive p-1"
                      onClick={() => setDateMode("ALL")}
                    >
                      Tozalash
                    </Button>
                  )}
                </div>

                {/* Filter Mode Selector */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg text-xs">
                  <button
                    type="button"
                    className={`py-1 px-1 rounded-md text-center transition-all ${
                      dateMode === "ALL"
                        ? "bg-background font-semibold shadow-xs text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDateMode("ALL")}
                  >
                    Barchasi
                  </button>
                  <button
                    type="button"
                    className={`py-1 px-1 rounded-md text-center transition-all ${
                      dateMode === "DAY"
                        ? "bg-background font-semibold shadow-xs text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDateMode("DAY")}
                  >
                    Kunlik
                  </button>
                  <button
                    type="button"
                    className={`py-1 px-1 rounded-md text-center transition-all ${
                      dateMode === "MONTH"
                        ? "bg-background font-semibold shadow-xs text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDateMode("MONTH")}
                  >
                    Oylik
                  </button>
                  <button
                    type="button"
                    className={`py-1 px-1 rounded-md text-center transition-all ${
                      dateMode === "YEAR"
                        ? "bg-background font-semibold shadow-xs text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDateMode("YEAR")}
                  >
                    Yillik
                  </button>
                </div>

                {/* Dynamic Inputs based on mode */}
                {dateMode === "DAY" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Kungi sanani tanlang:</Label>
                    <Input
                      type="date"
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {dateMode === "MONTH" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Oyni tanlang:</Label>
                    <Input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {dateMode === "YEAR" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Yilni tanlang:</Label>
                    <Input
                      type="number"
                      min="2020"
                      max="2035"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      placeholder="2026"
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {/* Preset Buttons */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-1 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5"
                    onClick={() => {
                      setDateMode("DAY");
                      setSelectedDay(new Date().toISOString().slice(0, 10));
                    }}
                  >
                    Bugun
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5"
                    onClick={() => {
                      setDateMode("MONTH");
                      setSelectedMonth(new Date().toISOString().slice(0, 7));
                    }}
                  >
                    Shu oy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5"
                    onClick={() => {
                      setDateMode("YEAR");
                      setSelectedYear(new Date().getFullYear().toString());
                    }}
                  >
                    Shu yil
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={handleExportExcel}
              disabled={filteredPayments.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Excel
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/50">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-12 text-center">№</TableHead>
                <TableHead>Sana va vaqt</TableHead>
                <TableHead>To'lov / Amaliyot turi</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead>Izoh / Tafsilot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    To'lovlar yoki o'zgarishlar tarixi topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                pg.paged.map((p, idx) => {
                  const itemIndex = (pg.page - 1) * pg.pageSize + idx + 1;
                  const dateObj = new Date(p.date);
                  const formattedDate = dateObj.toLocaleDateString("uz-UZ", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("uz-UZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="text-center text-xs text-muted-foreground font-medium">
                        {itemIndex}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium text-xs">{formattedDate}</div>
                        <div className="text-[11px] text-muted-foreground">{formattedTime}</div>
                      </TableCell>
                      <TableCell>
                        {p.type === "Avans" ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border-none font-medium"
                          >
                            Avans
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 border-none font-medium"
                          >
                            Oylik
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatSom(p.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(p as { note?: string }).note || (
                          <span className="text-xs text-muted-foreground/60">
                            {p.type === "Avans" ? "Avans to'lovi berildi" : "Oylik maosh to'landi"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <PaginationBar {...pg} />
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>To'lov kiritish: {employee.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>To'lov turi</Label>
              <Select
                value={paymentType}
                onValueChange={(val) => setPaymentType(val as "Avans" | "Oylik")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Avans">Avans</SelectItem>
                  <SelectItem value="Oylik">Oylik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Summa (so'm)</Label>
              <Input
                type="number"
                value={paymentAmount || ""}
                onChange={(e) => setPaymentAmount(+e.target.value)}
                placeholder="Masalan: 1000000"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Izoh / Izoh matni (ixtiyoriy)</Label>
              <Input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Masalan: Sentabr oyi avansi"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handlePayment}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Info Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xodim ma'lumotlarini tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>F.I.SH</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Lavozim</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Oylik (so'm)</Label>
              <Input
                type="number"
                value={editForm.salary}
                onChange={(e) => setEditForm({ ...editForm, salary: +e.target.value })}
              />
            </div>
            <div>
              <Label>Ishga olingan sana</Label>
              <Input
                type="date"
                value={editForm.hireDate}
                onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Holati</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v as "Faol" | "Nofaol" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Faol">Faol</SelectItem>
                  <SelectItem value="Nofaol">Nofaol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleEditSubmit}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
