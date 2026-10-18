import React, { useCallback, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatSom, formatNumber, formatDate } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  StatCard,
  usePagination,
  exportToExcel,
  useConfirm,
} from "@/components/ui-kit";
import { BatteryCharging, ArrowDownLeft, ArrowUpRight, Download, Truck, Scale } from "lucide-react";
import { toast } from "sonner";
import type { UsedBatteryEntry } from "@/lib/types";
import { UsedBatteryDialogs, KirimFormState, ChiqimFormState } from "./UsedBatteryDialogs";
import { UsedBatteriesTable } from "./UsedBatteriesTable";

export function UsedBatteriesPage() {
  const { usedBatteries, addUsedBattery, updateUsedBattery, deleteUsedBattery, customers } =
    useStore();
  const { confirm, confirmNode } = useConfirm();

  const [activeTab, setActiveTab] = useState<"ALL" | "kirim" | "chiqim">("ALL");
  const [search, setSearch] = useState("");

  const [dateMode, setDateMode] = useState<"ALL" | "DAY" | "MONTH" | "YEAR">("ALL");
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [kirimOpen, setKirimOpen] = useState(false);
  const [chiqimOpen, setChiqimOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [kirimForm, setKirimForm] = useState<KirimFormState>({
    customerName: "",
    batteryType: "60 Ah",
    weightKg: 15,
    totalAmount: 180000,
    note: "",
  });

  const [chiqimForm, setChiqimForm] = useState<ChiqimFormState>({
    factoryName: "Jizzax Akkumulyator Zavodi",
    weightKg: 100,
    pricePerKg: 12500,
    paymentMethod: "O'tkazma",
    status: "To'langan",
    note: "",
  });

  const list = useMemo(() => usedBatteries || [], [usedBatteries]);

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

  const pg = usePagination(filteredList, 50);

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

  const handleRemove = async (id: string) => {
    const ok = await confirm({
      title: "Yozuvni o'chirish",
      description: "Ushbu yozuvni o'chirib tashlamoqchimisiz? Qoldiqlar qayta hisoblanadi.",
      destructive: true,
      confirmText: "O'chirish",
    });
    if (ok) {
      deleteUsedBattery(id);
      toast.success("Muvaffaqiyatli o'chirildi");
    }
  };

  const handleExport = () => {
    const headers = [
      { label: "Sana", key: "date" },
      { label: "Turi", key: "type" },
      { label: "Mijoz / Zavod", key: "party" },
      { label: "Akkumulyator turi", key: "batteryType" },
      { label: "Og'irlik (kg)", key: "weightKg" },
      { label: "1 kg narxi", key: "pricePerKg" },
      { label: "Jami summa", key: "totalAmount" },
      { label: "Izoh", key: "note" },
    ];
    const data = filteredList.map((x) => ({
      ...x,
      date: formatDate(x.date),
      type: x.type === "kirim" ? "Mijozdan qabul" : "Zavodga topshirish",
      party: x.customerName || x.factoryName || "—",
      pricePerKg: x.pricePerKg ? x.pricePerKg : "—",
    }));
    exportToExcel(
      data,
      headers,
      "Eski Akkumulyatorlar Ro'yxati",
      `eski_akkumulyatorlar_${new Date().toISOString().slice(0, 10)}.xls`,
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {confirmNode}

      <PageHeader
        title="Eski akkumulyatorlar (Lom)"
        subtitle="Mijozlardan qabul qilingan eski batareyalar va zavodga topshirish hisobi"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setEditingId(null);
                setKirimOpen(true);
              }}
            >
              <ArrowDownLeft className="h-4 w-4 mr-1" />
              Qabul qilish (Kirim)
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingId(null);
                setChiqimOpen(true);
              }}
            >
              <Truck className="h-4 w-4 mr-1" />
              Zavodga topshirish (Chiqim)
            </Button>
          </div>
        }
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ombordagi lom qoldig'i"
          value={`${formatNumber(stockKg)} kg`}
          hint="Topshirishga tayyor zaxira"
          icon={BatteryCharging}
          accent="primary"
        />
        <StatCard
          label="Jami qabul qilingan"
          value={`${formatNumber(totalKirimKg)} kg`}
          hint="Mijozlardan olingan eski batareyalar"
          icon={Scale}
          accent="success"
        />
        <StatCard
          label="Zavodga topshirilgan"
          value={`${formatNumber(totalChiqimKg)} kg`}
          hint="Lom sifatida yuborilgan"
          icon={Truck}
          accent="info"
        />
        <StatCard
          label="Lomdan tushgan mablag'"
          value={formatSom(totalChiqimSumma)}
          hint="Zavoddan olingan daromad"
          icon={ArrowUpRight}
          accent="warning"
        />
      </div>

      {/* Main Table */}
      <UsedBatteriesTable
        pg={pg}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={search}
        setSearch={setSearch}
        dateMode={dateMode}
        setDateMode={setDateMode}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        datePopoverOpen={datePopoverOpen}
        setDatePopoverOpen={setDatePopoverOpen}
        totalItemsCount={list.length}
        getDateFilterLabel={getDateFilterLabel}
        onRemove={handleRemove}
      />

      {/* Dialogs */}
      <UsedBatteryDialogs
        kirimOpen={kirimOpen}
        setKirimOpen={setKirimOpen}
        kirimForm={kirimForm}
        setKirimForm={setKirimForm}
        handleKirimSubmit={handleKirimSubmit}
        customers={customers}
        chiqimOpen={chiqimOpen}
        setChiqimOpen={setChiqimOpen}
        chiqimForm={chiqimForm}
        setChiqimForm={setChiqimForm}
        handleChiqimSubmit={handleChiqimSubmit}
      />
    </div>
  );
}
