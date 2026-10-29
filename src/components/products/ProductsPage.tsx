import React, { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
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
import { productsApi } from "@/lib/api";
import { formatSom } from "@/lib/constants";
import { Plus, Download, ShoppingCart } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ProductImportDialog } from "@/components/ProductImportDialog";
import type { Product } from "@/lib/types";
import { toast } from "sonner";
import { ProductFormDialog } from "./ProductFormDialog";
import { ProductsTable } from "./ProductsTable";

function matchProductSearch(p: Product, query: string): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();
  const searchables: (string | number | undefined | null)[] = [
    p.name,
    p.sku,
    p.category,
    p.vehicle,
    ...(p.vehicles || []),
    p.description,
    p.attributes?.unitBrand,
    p.attributes?.amperage,
    p.attributes?.voltage,
    p.attributes?.tireSize,
    p.attributes?.tireSeason,
    p.buyPrice != null ? String(p.buyPrice) : undefined,
    p.sellPrice != null ? String(p.sellPrice) : undefined,
  ];
  return searchables.some((val) => val != null && String(val).toLowerCase().includes(q));
}

export function ProductsPage() {
  const t = useT();
  const { products, categories, vehicleBrands, addProduct, deleteProduct, usdRate } = useStore();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [veh, setVeh] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
    [categories],
  );

  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  const totalBuyCost = useMemo(
    () => products.reduce((acc, p) => acc + (p.buyPrice || 0) * (p.quantity || 0), 0),
    [products],
  );

  const [serverPage, setServerPage] = useState(1);
  const [serverPages, setServerPages] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);
  const [pageItems, setPageItems] = useState<Product[]>([]);
  const pageSize = 50;
  const serverVehicle = veh === "all" ? "" : veh;

  useEffect(() => {
    let active = true;
    productsApi
      .getPage({
        page: serverPage,
        limit: pageSize,
        search,
        category: cat === "all" ? "" : cat,
        vehicle: serverVehicle,
      })
      .then((result) => {
        if (!active) return;
        setServerPages(result.pages);
        setServerTotal(result.total);
        setPageItems(result.items);
      })
      .catch(() => {
        if (!active) return;
        const filtered = products.filter((p) => {
          const matchCat = cat === "all" || p.category === cat;
          const matchVeh =
            serverVehicle === "" ||
            p.vehicle === serverVehicle ||
            (p.vehicles && p.vehicles.includes(serverVehicle)) ||
            (p.vehicle && p.vehicle.includes(serverVehicle));
          const matchSearch = matchProductSearch(p, search);
          return matchCat && matchVeh && matchSearch;
        });
        const total = filtered.length;
        const pages = Math.ceil(total / pageSize) || 1;
        const start = (serverPage - 1) * pageSize;
        setServerPages(pages);
        setServerTotal(total);
        setPageItems(filtered.slice(start, start + pageSize));
      });
    return () => {
      active = false;
    };
  }, [products, serverPage, search, cat, serverVehicle]);

  useEffect(() => {
    setServerPage(1);
  }, [search, cat, serverVehicle]);

  const allFilteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = cat === "all" || p.category === cat;
      const matchVeh =
        serverVehicle === "" ||
        p.vehicle === serverVehicle ||
        (p.vehicles && p.vehicles.includes(serverVehicle)) ||
        (p.vehicle && p.vehicle.includes(serverVehicle));
      const matchSearch = matchProductSearch(p, search);
      return matchCat && matchVeh && matchSearch;
    });
  }, [products, cat, serverVehicle, search]);

  const { items: sortedProducts, sortConfig, requestSort } = useSortableData(pageItems);

  const pg = {
    paged: sortedProducts,
    page: serverPage,
    setPage: setServerPage,
    totalPages: serverPages,
    totalItems: serverTotal,
    pageSize,
  };

  const allFilteredIds = useMemo(() => allFilteredProducts.map((p) => p.id), [allFilteredProducts]);
  const allChecked = allFilteredIds.length > 0 && allFilteredIds.every((id) => sel.has(id));

  const startEdit = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setDialogOpen(true);
  };

  const removeOne = async (id: string, name: string) => {
    const ok = await confirm({
      title: t("products.deleteTitle"),
      description: t("products.deleteDesc", { name }),
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    const snap = products.find((p) => p.id === id);
    deleteProduct(id);
    toast.success(`${t("toast.deleted")}: ${name}`, {
      action: snap ? { label: t("common.undo"), onClick: () => addProduct(snap) } : undefined,
    });
  };

  const removeBulk = async () => {
    const ok = await confirm({
      title: t("common.bulkDelete"),
      description: t("products.bulkDeleteDesc", { n: sel.count }),
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    const snaps = products.filter((p) => sel.has(p.id));
    const names = snaps.map((p) => p.name);
    snaps.forEach((p) => deleteProduct(p.id));
    sel.clear();
    toast.success(t("toast.deletedMany", { n: snaps.length }), {
      description: names.slice(0, 3).join(", ") + (names.length > 3 ? "..." : ""),
      action: {
        label: t("common.undo"),
        onClick: () => snaps.forEach((p) => addProduct(p)),
      },
    });
  };

  const productExportHeaders = [
    { label: "ID", key: "id" },
    { label: "Nomi", key: "name" },
    { label: "Kategoriya", key: "category" },
    { label: "Mashina rusumi", key: "vehicle" },
    { label: "Sotib olish narxi", key: "buyPrice" },
    { label: "Soni", key: "quantity" },
    { label: "Min qoldiq", key: "minQty" },
  ];

  const handleExportCSV = () => {
    exportToCSV(
      allFilteredProducts as unknown as Record<string, unknown>[],
      productExportHeaders,
      `mahsulotlar_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const handleExportExcel = () => {
    exportToExcel(
      allFilteredProducts as unknown as Record<string, unknown>[],
      productExportHeaders,
      "Mahsulotlar Ro'yxati",
      `mahsulotlar_${new Date().toISOString().slice(0, 10)}.xls`,
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {confirmNode}

      <PageHeader
        showBack={false}
        title={t("products.title")}
        subtitle={t("products.subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ProductImportDialog />
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              {t("products.new")}
            </Button>
          </div>
        }
      />

      {/* Warehouse Total Buy Cost Card */}
      <Card className="p-5 rounded-2xl border bg-gradient-to-br from-amber-500/5 to-orange-500/5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Omborning umumiy qiymati (sotib olish narxi)
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatSom(totalBuyCost)}
              </div>
              {usdRate > 0 && (
                <div className="text-sm text-amber-600 dark:text-amber-400 font-mono font-semibold mt-0.5">
                  ≈ $
                  {(totalBuyCost / usdRate).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  USD
                </div>
              )}
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground">Jami tovarlar</div>
            <div className="text-2xl font-bold text-foreground">
              {serverTotal || products.length}
            </div>
            <div className="text-xs text-muted-foreground">ta mahsulot</div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <ProductsTable
        search={search}
        setSearch={setSearch}
        veh={veh}
        setVeh={setVeh}
        cat={cat}
        setCat={setCat}
        vehicleBrands={vehicleBrands}
        sortedCategories={sortedCategories}
        sel={sel}
        allChecked={allChecked}
        allFilteredIds={allFilteredIds}
        sortConfig={sortConfig}
        requestSort={requestSort}
        pg={pg}
        usdRate={usdRate}
        t={t}
        onEdit={startEdit}
        onDelete={removeOne}
        onBulkDelete={removeBulk}
      />

      {/* Form Dialog */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingId(null);
        }}
        editingId={editingId}
        editingProduct={products.find((p) => p.id === editingId) || null}
        categories={categories}
        vehicleBrands={vehicleBrands}
        products={products}
        usdRate={usdRate}
        onSaved={() => {
          setDialogOpen(false);
          setEditingId(null);
        }}
      />
    </div>
  );
}
