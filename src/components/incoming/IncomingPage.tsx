import React, { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader, useConfirm, usePagination, useSelection } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import type { IncomingStock, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, PackagePlus, ArrowUpDown, ArrowDownToLine, X } from "lucide-react";
import { toast } from "sonner";
import { useT, useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { TransferToProductsDialog } from "./TransferToProductsDialog";
import { ProductCompareHistoryDialog } from "./ProductCompareHistoryDialog";
import { IncomingFormDialog, IncomingFormPayload } from "./IncomingFormDialog";
import { PriceComparisonTab } from "./PriceComparisonTab";
import { IncomingTableTab } from "./IncomingTableTab";

interface IncomingPageProps {
  initialRegion?: string;
  initialTab?: "incoming" | "price-comparison";
}

export function IncomingPage({ initialRegion, initialTab }: IncomingPageProps) {
  const t = useT();
  const { lang } = useLang();
  const isRu = lang === "ru";

  const {
    incoming,
    products,
    categories,
    vehicleBrands,
    incomingCategories,
    addIncoming,
    updateIncoming,
    deleteIncoming,
    applyIncomingToProducts,
    usdRate,
  } = useStore();

  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  // Active tab: "incoming" | "price-comparison"
  const [activeTab, setActiveTab] = useState<"incoming" | "price-comparison">(
    initialTab === "price-comparison" ? "price-comparison" : "incoming",
  );

  useEffect(() => {
    if (initialTab === "price-comparison" || initialTab === "incoming") {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Filters for incoming tab
  const [regionFilter, setRegionFilter] = useState<string>(initialRegion || "all");
  const [incomingSearch, setIncomingSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "applied">("all");
  const [dateFilterMode, setDateFilterMode] = useState<"ALL" | "TODAY" | "YESTERDAY" | "CUSTOM">(
    "ALL",
  );
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (initialRegion) {
      setRegionFilter(initialRegion);
    }
  }, [initialRegion]);

  // Apply to products dialog state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);

  const pendingIncomings = useMemo(() => {
    return incoming.filter((i) => i.status === "pending");
  }, [incoming]);

  const matchesDate = (dateIso: string) => {
    if (dateFilterMode === "ALL") return true;
    const dStr = new Date(dateIso).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (dateFilterMode === "TODAY") return dStr === today;
    if (dateFilterMode === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return dStr === y.toISOString().slice(0, 10);
    }
    if (dateFilterMode === "CUSTOM") {
      return dStr === customDate;
    }
    return true;
  };

  // Filtered & sorted incoming
  const filteredIncoming = useMemo(() => {
    return incoming.filter((item) => {
      if (regionFilter !== "all" && item.region !== regionFilter) return false;
      if (statusFilter !== "all" && (item.status || "applied") !== statusFilter) return false;
      if (!matchesDate(item.date)) return false;
      if (incomingSearch.trim()) {
        const query = incomingSearch.toLowerCase().trim();
        const p = products.find((x) => x.id === item.productId);
        const matchesProduct =
          p?.name?.toLowerCase().includes(query) || p?.vehicle?.toLowerCase().includes(query);
        const matchesRegion = item.region?.toLowerCase().includes(query);
        if (!matchesProduct && !matchesRegion) return false;
      }
      return true;
    });
  }, [incoming, regionFilter, statusFilter, dateFilterMode, customDate, incomingSearch, products]);

  const sorted = useMemo(
    () => [...filteredIncoming].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [filteredIncoming],
  );
  const pg = usePagination(sorted, 50);
  const pageIds = pg.paged.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => sel.has(id));

  // Incoming form state
  const [incomingOpen, setIncomingOpen] = useState(false);
  const [editingIncoming, setEditingIncoming] = useState<IncomingStock | null>(null);

  // Selected product for compare history dialog
  const [selectedCompareProduct, setSelectedCompareProduct] = useState<Product | null>(null);

  const openNewIncoming = () => {
    setEditingIncoming(null);
    setIncomingOpen(true);
  };

  const openEditIncoming = (i: IncomingStock) => {
    setEditingIncoming(i);
    setIncomingOpen(true);
  };

  const removeOneIncoming = async (id: string) => {
    const ok = await confirm({
      title: t("incoming.deleteTitle"),
      description: t("incoming.deleteDesc"),
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (ok) {
      deleteIncoming(id);
      toast.success(t("toast.deleted"));
    }
  };

  const removeBulkIncoming = async () => {
    const ok = await confirm({
      title: t("common.bulkDelete"),
      description: t("incoming.bulkDeleteDesc", { n: sel.count }),
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    const n = sel.count;
    sel.selected.forEach((id) => deleteIncoming(id));
    sel.clear();
    toast.success(t("incoming.bulkDeleted", { n }));
  };

  const handleSaveIncoming = (payload: IncomingFormPayload, editingId: string | null) => {
    if (editingId) {
      updateIncoming(editingId, payload);
      toast.success(isRu ? "Поступление обновлено" : "Kirim muvaffaqiyatli tahrirlandi");
    } else {
      addIncoming({
        id: `inc_${Math.random().toString(36).slice(2, 9)}`,
        date: new Date().toISOString(),
        status: "pending",
        ...payload,
      });
      toast.success(
        isRu
          ? "Поступление сохранено (в ожидании добавления в базу)"
          : "Kirim saqlandi (tovarlar bazasiga qo'shish kutilmoqda)",
      );
    }
    setIncomingOpen(false);
  };

  const handleApplyBatch = async () => {
    if (selectedPendingIds.length === 0) {
      toast.error(isRu ? "Выберите хотя бы один товар" : "Kamida bitta tovarni tanlang");
      return;
    }
    const ok = await confirm({
      title: isRu ? "Добавить товары в базу?" : "Tovarlarni bazaga qo'shishni tasdiqlaysizmi?",
      description: isRu
        ? `Выбранные позиции (${selectedPendingIds.length} шт.) будут перенесены в основной остаток товаров склада.`
        : `Tanlangan kirimlar (${selectedPendingIds.length} ta) tovarlar bazasidagi qoldiqqa to'liq qo'shiladi va holati "Qo'shilgan"ga o'zgaradi.`,
      confirmText: isRu ? "Да, добавить в базу" : "Ha, bazaga qo'shish",
    });
    if (!ok) return;

    await applyIncomingToProducts(selectedPendingIds);
    setApplyModalOpen(false);
    setSelectedPendingIds([]);
    toast.success(
      isRu
        ? `Успешно добавлено ${selectedPendingIds.length} позиций в базу товаров!`
        : `${selectedPendingIds.length} ta kirim tovarlar bazasiga muvaffaqiyatli qo'shildi!`,
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {confirmNode}

      {/* Sticky Top Header & Tab Controls */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-2 pb-3 -mt-2 space-y-3 border-b border-border/40">
        <PageHeader
          title={
            activeTab === "price-comparison"
              ? isRu
                ? "Сравнение цен по регионам"
                : "Viloyatlar narx tahlili"
              : isRu
                ? "Поступления товаров"
                : "Kirimlar"
          }
          subtitle={
            activeTab === "price-comparison"
              ? isRu
                ? "Анализ цен на одни и те же запчасти из разных областей"
                : "Bir xil ehtiyot qismlarni viloyatlar kesimida tahlil qilish"
              : isRu
                ? "Omborga kirgan tovarlar va kirim narxlari boshqaruvi"
                : "Omborga kirgan tovarlar va narxlar tahlili"
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/incoming-categories">
                <Button variant="outline" size="default" className="text-xs sm:text-sm">
                  <MapPin className="h-4 w-4 mr-1.5 text-primary" />
                  {isRu ? "Категории регионов" : "Kirim kategoriyalari"}
                </Button>
              </Link>

              <Button
                onClick={() => {
                  setSelectedPendingIds(pendingIncomings.map((x) => x.id));
                  setApplyModalOpen(true);
                }}
                className={cn(
                  "font-semibold shadow-xs transition-all text-xs sm:text-sm",
                  pendingIncomings.length > 0
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                <ArrowDownToLine className="h-4 w-4 mr-1.5" />
                {isRu ? "Добавить в базу товаров" : "Tovar bazasiga qo'shish"}
                {pendingIncomings.length > 0 && (
                  <Badge className="ml-1.5 bg-white/25 hover:bg-white/35 text-white border-0 px-1.5 py-0 text-xs font-bold rounded-full">
                    {pendingIncomings.length}
                  </Badge>
                )}
              </Button>

              <Button onClick={openNewIncoming}>
                <Plus className="h-4 w-4 mr-1" /> {t("incoming.new")}
              </Button>
            </div>
          }
        />

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit border border-border/40">
            <button
              onClick={() => setActiveTab("incoming")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === "incoming"
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <PackagePlus className="h-4 w-4" />
              {isRu ? "Список поступлений" : "Kirimlar ro'yxati"}
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {incoming.length}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab("price-comparison")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all relative",
                activeTab === "price-comparison"
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowUpDown className="h-4 w-4 text-emerald-500" />
              <span>{isRu ? "Сравнение цен (Регионы)" : "Viloyatlar narx tahlili"}</span>
            </button>
          </div>

          {regionFilter !== "all" && activeTab === "incoming" && (
            <div className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-xl border border-primary/20">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {isRu ? "Фильтр региона:" : "Tanlangan viloyat:"} <strong>{regionFilter}</strong>
              </span>
              <button
                onClick={() => setRegionFilter("all")}
                className="ml-1 hover:bg-primary/20 p-0.5 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === "price-comparison" && (
        <PriceComparisonTab
          incoming={incoming}
          products={products}
          incomingCategories={incomingCategories}
          usdRate={usdRate}
          isRu={isRu}
          onOpenNewIncoming={openNewIncoming}
          onSelectProductForHistory={(prod) => setSelectedCompareProduct(prod)}
        />
      )}

      {activeTab === "incoming" && (
        <IncomingTableTab
          incomingSearch={incomingSearch}
          setIncomingSearch={setIncomingSearch}
          regionFilter={regionFilter}
          setRegionFilter={setRegionFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateFilterMode={dateFilterMode}
          setDateFilterMode={setDateFilterMode}
          customDate={customDate}
          setCustomDate={setCustomDate}
          incomingCategories={incomingCategories}
          pg={pg}
          sel={sel}
          pageIds={pageIds}
          allChecked={allChecked}
          products={products}
          usdRate={usdRate}
          isRu={isRu}
          t={t}
          onEditIncoming={openEditIncoming}
          onDeleteIncoming={removeOneIncoming}
          onBulkDelete={removeBulkIncoming}
          onOpenApplyModal={(ids) => {
            setSelectedPendingIds(ids);
            setApplyModalOpen(true);
          }}
        />
      )}

      {/* Dialogs */}
      <TransferToProductsDialog
        open={applyModalOpen}
        onOpenChange={setApplyModalOpen}
        pendingIncomings={pendingIncomings}
        selectedPendingIds={selectedPendingIds}
        setSelectedPendingIds={setSelectedPendingIds}
        onApplyBatch={handleApplyBatch}
        products={products}
        usdRate={usdRate}
        isRu={isRu}
      />

      <IncomingFormDialog
        open={incomingOpen}
        onOpenChange={setIncomingOpen}
        editingItem={editingIncoming}
        onSave={handleSaveIncoming}
        products={products}
        categories={categories}
        vehicleBrands={vehicleBrands}
        incomingCategories={incomingCategories}
        incoming={incoming}
        usdRate={usdRate}
        isRu={isRu}
        defaultRegion={regionFilter !== "all" ? regionFilter : incomingCategories[0] || ""}
      />

      <ProductCompareHistoryDialog
        product={selectedCompareProduct}
        incoming={incoming}
        isRu={isRu}
        onClose={() => setSelectedCompareProduct(null)}
      />
    </div>
  );
}
