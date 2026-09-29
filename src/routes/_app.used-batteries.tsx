import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatSom, formatNumber } from "@/lib/constants";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PageHeader,
  StatCard,
  usePagination,
  PaginationBar,
  exportToExcel,
  useConfirm,
} from "@/components/ui-kit";
import {
  BatteryCharging,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Plus,
  Truck,
  Search,
  Calendar,
  CalendarDays,
  Edit,
  Trash2,
  X,
  Scale,
  Building2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import type { UsedBatteryEntry } from "@/lib/types";

export const Route = createFileRoute("/_app/used-batteries")({
  component: UsedBatteriesPage,
});

function UsedBatteriesPage() {
  const { usedBatteries, addUsedBattery, updateUsedBattery, deleteUsedBattery, customers } =
    useStore();
  const { confirm, confirmNode } = useConfirm();

  // Active Tab & Search
  const [activeTab, setActiveTab] = useState<"ALL" | "kirim" | "chiqim">("ALL");
  const [search, setSearch] = useState("");

  // Date Filter State
  const [dateMode, setDateMode] = useState<"ALL" | "DAY" | "MONTH" | "YEAR">("ALL");
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Dialog States
  const [kirimOpen, setKirimOpen] = useState(false);
  const [chiqimOpen, setChiqimOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Kirim Form State
  const [kirimForm, setKirimForm] = useState({
    customerName: "",
    batteryType: "60 Ah",
    weightKg: 15,
    totalAmount: 180000,
    note: "",
  });

  // Chiqim Form State
  const [chiqimForm, setChiqimForm] = useState({
    factoryName: "Jizzax Akkumulyator Zavodi",
    weightKg: 100,
    pricePerKg: 12500,
    paymentMethod: "O'tkazma" as "Naqd" | "Karta" | "O'tkazma" | "Qarz",
    status: "To'langan" as "To'langan" | "Kutilmoqda",
    note: "",
  });

  const list = usedBatteries || [];

  // Metrics
  const totalKirimKg = list
    .filter((x) => x.type === "kirim")
    .reduce((sum, x) => sum + x.weightKg, 0);

  const totalChiqimKg = list
    .filter((x) => x.type === "chiqim")
    .reduce((sum, x) => sum + x.weightKg, 0);

  const stockKg = Math.max(0, totalKirimKg - totalChiqimKg);

  const totalChiqimSumma = list
    .filter((x) => x.type === "chiqim")
    .reduce((sum, x) => sum + x.totalAmount, 0);

  // Date filter matching logic
  const matchesDate = useCallback(
    (isoDate: string) => {
      if (dateMode === "ALL") return true;
      const dateObj = new Date(isoDate);
      const pDateStr = dateObj.toISOString().slice(0, 10);
      const pMonthStr = dateObj.toISOString().slice(0, 7);
      const pYearStr = dateObj.getFullYear().toString();

      if (dateMode === "DAY") return pDateStr === selectedDay;
      if (dateMode === "MONTH") return pMonthStr === selectedMonth;
      if (dateMode === "YEAR") return pYearStr === selectedYear;
      return true;
    },
    [dateMode, selectedDay, selectedMonth, selectedYear],
  );

  const getDateFilterLabel = () => {
    if (dateMode === "ALL") return "Sana bo'yicha";
    if (dateMode === "DAY") return `Kun: ${selectedDay}`;
    if (dateMode === "MONTH") return `Oy: ${selectedMonth}`;
    if (dateMode === "YEAR") return `Yil: ${selectedYear}`;
    return "Sana";
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return list
      .filter((item) => {
        const matchesTab = activeTab === "ALL" || item.type === activeTab;
        const name = (item.customerName || item.factoryName || "").toLowerCase();
        const note = (item.note || "").toLowerCase();
        const bType = (item.batteryType || "").toLowerCase();
        const matchesSearch =
          name.includes(search.toLowerCase()) ||
          note.includes(search.toLowerCase()) ||
          bType.includes(search.toLowerCase()) ||
          item.weightKg.toString().includes(search);
        const matchesD = matchesDate(item.date);
        return matchesTab && matchesSearch && matchesD;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [list, activeTab, search, matchesDate]);

  const pg = usePagination(filteredList, 10);

  // Handle Kirim Submit
  const handleKirimSubmit = () => {
    if (kirimForm.weightKg <= 0) {
      toast.error("Og'irlik (kg) 0 dan katta bo'lishi kerak");
      return;
    }

    if (editingId) {
      updateUsedBattery(editingId, {
        customerName: kirimForm.customerName.trim() || "Noma'lum mijoz",
        batteryType: kirimForm.batteryType,
        weightKg: kirimForm.weightKg,
        totalAmount: kirimForm.totalAmount,
        note: kirimForm.note.trim() || undefined,
      });
      toast.success("Kirim yangilandi");
    } else {
      const entry: UsedBatteryEntry = {
        id: `ub_${Math.random().toString(36).slice(2, 9)}`,
        date: new Date().toISOString(),
        type: "kirim",
        customerName: kirimForm.customerName.trim() || "Mijoz",
        batteryType: kirimForm.batteryType,
        weightKg: kirimForm.weightKg,
        totalAmount: kirimForm.totalAmount,
        note: kirimForm.note.trim() || undefined,
      };
      addUsedBattery(entry);
      toast.success(`Eski akkumulyator qabul qilindi: ${kirimForm.weightKg} kg`);
    }

    setKirimOpen(false);
    setEditingId(null);
    setKirimForm({
      customerName: "",
      batteryType: "60 Ah",
      weightKg: 15,
      totalAmount: 180000,
      note: "",
    });
  };

  // Handle Chiqim Submit
  const handleChiqimSubmit = () => {
    if (chiqimForm.weightKg <= 0) {
      toast.error("Og'irlik (kg) 0 dan katta bo'lishi kerak");
      return;
    }

    const calculatedTotal = chiqimForm.weightKg * chiqimForm.pricePerKg;

    if (editingId) {
      updateUsedBattery(editingId, {
        factoryName: chiqimForm.factoryName.trim() || "Akkumulyator Zavodi",
        weightKg: chiqimForm.weightKg,
        pricePerKg: chiqimForm.pricePerKg,
        totalAmount: calculatedTotal,
        paymentMethod: chiqimForm.paymentMethod,
        status: chiqimForm.status,
        note: chiqimForm.note.trim() || undefined,
      });
      toast.success("Chiqim yangilandi");
    } else {
      const entry: UsedBatteryEntry = {
        id: `ub_${Math.random().toString(36).slice(2, 9)}`,
        date: new Date().toISOString(),
        type: "chiqim",
        factoryName: chiqimForm.factoryName.trim() || "Akkumulyator Zavodi",
        weightKg: chiqimForm.weightKg,
        pricePerKg: chiqimForm.pricePerKg,
        totalAmount: calculatedTotal,
        paymentMethod: chiqimForm.paymentMethod,
        status: chiqimForm.status,
        note: chiqimForm.note.trim() || undefined,
      };
      addUsedBattery(entry);
      toast.success(
        `Zavodga topshirildi: ${chiqimForm.weightKg} kg (${formatSom(calculatedTotal)})`,
      );
    }

    setChiqimOpen(false);
    setEditingId(null);
    setChiqimForm({
      factoryName: "Jizzax Akkumulyator Zavodi",
      weightKg: 100,
      pricePerKg: 12500,
      paymentMethod: "O'tkazma",
      status: "To'langan",
      note: "",
    });
  };

  // Handle Remove Entry
  const handleRemove = async (id: string) => {
    const ok = await confirm({
      title: "Yozuvni o'chirish",
      description: "Ushbu lom yozuvi o'chirilsinmi?",
      destructive: true,
      confirmText: "O'chirish",
    });
    if (ok) {
      deleteUsedBattery(id);
      toast.success("Yozuv o'chirildi");
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const rows = filteredList.map((item, idx) => {
      const dt = new Date(item.date);
      return {
        index: idx + 1,
        date: dt.toLocaleDateString("uz-UZ"),
        time: dt.toLocaleTimeString("uz-UZ"),
        type: item.type === "kirim" ? "Mijozdan Kirim" : "Zavodga Chiqim",
        name: item.customerName || item.factoryName || "—",
        batteryType: item.batteryType || "Lom",
        weightKg: item.weightKg,
        pricePerKg: item.pricePerKg ? item.pricePerKg : "—",
        totalAmount: item.totalAmount,
        paymentMethod: item.paymentMethod || "—",
        note: item.note || "—",
      };
    });

    exportToExcel(
      rows,
      [
        { label: "№", key: "index" },
        { label: "Sana", key: "date" },
        { label: "Vaqt", key: "time" },
        { label: "Amaliyot turi", key: "type" },
        { label: "Mijoz / Zavod", key: "name" },
        { label: "Turi", key: "batteryType" },
        { label: "Og'irligi (kg)", key: "weightKg" },
        { label: "1 kg narxi (so'm)", key: "pricePerKg" },
        { label: "Jami summa (so'm)", key: "totalAmount" },
        { label: "To'lov turi", key: "paymentMethod" },
        { label: "Izoh", key: "note" },
      ],
      "Eski Akkumulyatorlar (Lom)",
      `eski_akkumulyatorlar_${new Date().toISOString().slice(0, 10)}.xls`,
    );
    toast.success("Excel yuklab olindi");
  };

  return (
    <div className="space-y-6">
      {confirmNode}

      <PageHeader
        title="Eski akkumulyatorlar (Lom ombori)"
        subtitle="Mijozlardan qabul qilingan va zavodga topshirilgan lom akkumulyatorlar hisob-kitobi"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-1.5" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              onClick={() => {
                setEditingId(null);
                setKirimOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5 text-emerald-600" />
              Mijozdan qabul qilish (Kirim)
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingId(null);
                setChiqimOpen(true);
              }}
            >
              <Truck className="h-4 w-4 mr-1.5" />
              Zavodga topshirish (Chiqim)
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ombordagi lom zaxirasi"
          value={`${formatNumber(stockKg)} kg`}
          icon={BatteryCharging}
          accent="primary"
        />
        <StatCard
          label="Jami qabul qilingan (Mijozlardan)"
          value={`${formatNumber(totalKirimKg)} kg`}
          icon={ArrowDownLeft}
          accent="info"
        />
        <StatCard
          label="Zavodga topshirilgan (Lom)"
          value={`${formatNumber(totalChiqimKg)} kg`}
          icon={ArrowUpRight}
          accent="warning"
        />
        <StatCard
          label="Zavoddan tushum (So'm)"
          value={formatSom(totalChiqimSumma)}
          icon={Scale}
          accent="success"
        />
      </div>

      {/* Table Card */}
      <Card className="rounded-2xl p-4 sm:p-5 border-border/60">
        {/* Toolbar: Tabs, Search, Date Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-border/50">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "ALL"
                  ? "bg-background font-semibold shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("ALL")}
            >
              Barchasi ({list.length})
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "kirim"
                  ? "bg-background font-semibold shadow-xs text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("kirim")}
            >
              Mijozlardan Kirim ({list.filter((x) => x.type === "kirim").length})
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "chiqim"
                  ? "bg-background font-semibold shadow-xs text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("chiqim")}
            >
              Zavodga Chiqim ({list.filter((x) => x.type === "chiqim").length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Qidirish (Mijoz, zavod, izoh)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

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
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-12 text-center">№</TableHead>
                <TableHead>Sana va vaqt</TableHead>
                <TableHead>Amaliyot turi</TableHead>
                <TableHead>Mijoz / Zavod nomi</TableHead>
                <TableHead>Turi / Amper</TableHead>
                <TableHead className="text-right">Og'irligi (kg)</TableHead>
                <TableHead className="text-right">1 kg narxi</TableHead>
                <TableHead className="text-right">Jami summa</TableHead>
                <TableHead>Izoh</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    Eski akkumulyatorlar yozuvlari topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                pg.paged.map((item, idx) => {
                  const itemIndex = (pg.page - 1) * pg.pageSize + idx + 1;
                  const dateObj = new Date(item.date);
                  const formattedDate = dateObj.toLocaleDateString("uz-UZ");
                  const formattedTime = dateObj.toLocaleTimeString("uz-UZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-center text-xs text-muted-foreground font-medium">
                        {itemIndex}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium text-xs">{formattedDate}</div>
                        <div className="text-[11px] text-muted-foreground">{formattedTime}</div>
                      </TableCell>
                      <TableCell>
                        {item.type === "kirim" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none hover:bg-emerald-500/25">
                            <ArrowDownLeft className="h-3 w-3 mr-1" /> Mijozdan Kirim
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-none hover:bg-blue-500/25">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> Zavodga Chiqim
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.type === "kirim" ? (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.customerName || "—"}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-primary">
                            <Building2 className="h-3.5 w-3.5" />
                            {item.factoryName || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {item.batteryType || "Lom"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatNumber(item.weightKg)} kg
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {item.pricePerKg ? formatSom(item.pricePerKg) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatSom(item.totalAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {item.note || "—"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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

      {/* Dialog 1: Mijozdan qabul qilish (Kirim) */}
      <Dialog open={kirimOpen} onOpenChange={setKirimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              Mijozdan eski akkumulyator qabul qilish (Kirim)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Mijoz ismi / Telefon (Ixtiyoriy)</Label>
              <Input
                placeholder="Masalan: Alijon Valiyev"
                value={kirimForm.customerName}
                onChange={(e) => setKirimForm({ ...kirimForm, customerName: e.target.value })}
                className="mt-1"
              />
              {customers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Tezkor tanlash:</span>
                  {customers.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="text-[11px] bg-muted px-2 py-0.5 rounded-md hover:bg-accent transition-colors"
                      onClick={() => setKirimForm({ ...kirimForm, customerName: c.name })}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Akkumulyator hajm/amper</Label>
                <Select
                  value={kirimForm.batteryType}
                  onValueChange={(v) => setKirimForm({ ...kirimForm, batteryType: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60 Ah">60 Ah</SelectItem>
                    <SelectItem value="75 Ah">75 Ah</SelectItem>
                    <SelectItem value="90 Ah">90 Ah</SelectItem>
                    <SelectItem value="100 Ah">100 Ah</SelectItem>
                    <SelectItem value="190 Ah">190 Ah (Yuk avto)</SelectItem>
                    <SelectItem value="Lom (Aralash)">Lom (Aralash)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Og'irligi (kg)</Label>
                <Input
                  type="number"
                  placeholder="15"
                  value={kirimForm.weightKg || ""}
                  onChange={(e) => setKirimForm({ ...kirimForm, weightKg: +e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Tushib berilgan summa / Chegirma (so'm)</Label>
              <Input
                type="number"
                placeholder="180000"
                value={kirimForm.totalAmount || ""}
                onChange={(e) => setKirimForm({ ...kirimForm, totalAmount: +e.target.value })}
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Eski akkumulyator evaziga mijozga yangi batareyadan chegirma qilib berilgan summa
              </p>
            </div>

            <div>
              <Label>Izoh / Qayd (Ixtiyoriy)</Label>
              <Input
                placeholder="Masalan: Yangi 60A batareya olganda topshirdi"
                value={kirimForm.note}
                onChange={(e) => setKirimForm({ ...kirimForm, note: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setKirimOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleKirimSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              Qabul qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Zavodga topshirish (Chiqim) */}
      <Dialog open={chiqimOpen} onOpenChange={setChiqimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Zavodga lom topshirish (Chiqim)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Zavod / Lom oluvchi nomi</Label>
              <Input
                placeholder="Masalan: Jizzax Akkumulyator Zavodi"
                value={chiqimForm.factoryName}
                onChange={(e) => setChiqimForm({ ...chiqimForm, factoryName: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Umumiy og'irlik (kg)</Label>
                <Input
                  type="number"
                  placeholder="250"
                  value={chiqimForm.weightKg || ""}
                  onChange={(e) => setChiqimForm({ ...chiqimForm, weightKg: +e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>1 kg narxi (so'm)</Label>
                <Input
                  type="number"
                  placeholder="12500"
                  value={chiqimForm.pricePerKg || ""}
                  onChange={(e) => setChiqimForm({ ...chiqimForm, pricePerKg: +e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="p-3 bg-muted/60 rounded-xl flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Jami hisoblangan summa:</span>
              <span className="font-bold text-base text-primary">
                {formatSom(chiqimForm.weightKg * chiqimForm.pricePerKg)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>To'lov turi</Label>
                <Select
                  value={chiqimForm.paymentMethod}
                  onValueChange={(v) =>
                    setChiqimForm({
                      ...chiqimForm,
                      paymentMethod: v as "Naqd" | "Karta" | "O'tkazma" | "Qarz",
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Naqd">Naqd pul</SelectItem>
                    <SelectItem value="Karta">Bank kartasi</SelectItem>
                    <SelectItem value="O'tkazma">Bank o'tkazmasi</SelectItem>
                    <SelectItem value="Qarz">Zavod qarzdorligi (Nasiya)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>To'lov holati</Label>
                <Select
                  value={chiqimForm.status}
                  onValueChange={(v) =>
                    setChiqimForm({ ...chiqimForm, status: v as "To'langan" | "Kutilmoqda" })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To'langan">To'langan</SelectItem>
                    <SelectItem value="Kutilmoqda">Kutilmoqda (Nasiya)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Izoh / Hujjat raqami (Ixtiyoriy)</Label>
              <Input
                placeholder="Masalan: N-124 yuk xati bo'yicha"
                value={chiqimForm.note}
                onChange={(e) => setChiqimForm({ ...chiqimForm, note: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setChiqimOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleChiqimSubmit}>Saqlash va topshirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
