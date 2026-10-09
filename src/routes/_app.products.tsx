import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
  StatusBadge,
  useConfirm,
  PaginationBar,
  useSelection,
  BulkBar,
  SelectCell,
  useSortableData,
  SortButton,
  exportToCSV,
  exportToExcel,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { productsApi } from "@/lib/api";
import { formatSom, formatPriceBoth } from "@/lib/constants";
import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Download,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  Circle,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { ProductImportDialog } from "@/components/ProductImportDialog";
import type { Product, ProductAttributes } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

const VOLTAGE_OPTIONS = ["6V", "12V", "24V", "36V", "48V", "60V", "72V"];

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

type FormState = {
  name: string;
  vehicles: string[];
  vehicle: string;
  category: string;
  buyPrice: number;
  buyPriceUsd: number;
  sellPrice: number;
  sellPriceUsd: number;
  quantity: number;
  minQty: number;
  unitBrand: string;
  amperage: string;
  voltage: string;
  customVoltage: string;
  tireSize: string;
  tireSeason: string;
};

const emptyForm = (firstCategory: string, firstBrand: string): FormState => ({
  name: "",
  vehicles: firstBrand ? [firstBrand] : [],
  vehicle: firstBrand || "",
  category: firstCategory || "Dvigatel",
  buyPrice: 0,
  buyPriceUsd: 0,
  sellPrice: 0,
  sellPriceUsd: 0,
  quantity: 0,
  minQty: 0,
  unitBrand: "Xitoy",
  amperage: "",
  voltage: "12V",
  customVoltage: "",
  tireSize: "",
  tireSeason: "Universal",
});

const isBattery = (cat: string) => /akkumulyator/i.test(cat);
const isTire = (cat: string) => /shina|balon/i.test(cat);

function ProductsPage() {
  const t = useT();
  const { products, categories, vehicleBrands, addProduct, updateProduct, deleteProduct, usdRate } =
    useStore();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [veh, setVeh] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [buyCurrency, setBuyCurrency] = useState<"UZS" | "USD">("UZS");
  const [categoryComboOpen, setCategoryComboOpen] = useState(false);
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
    [categories],
  );
  const [form, setForm] = useState<FormState>(
    emptyForm(categories[0] || "Dvigatel", vehicleBrands[0] || ""),
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

  // Sorting
  const { items: sortedProducts, sortConfig, requestSort } = useSortableData(pageItems);

  // Pagination
  const pg = {
    paged: sortedProducts,
    page: serverPage,
    setPage: setServerPage,
    totalPages: serverPages,
    totalItems: serverTotal,
    pageSize,
  };
  const pageIds = pg.paged.map((p) => p.id);
  const allFilteredIds = useMemo(() => allFilteredProducts.map((p) => p.id), [allFilteredProducts]);
  const allChecked = allFilteredIds.length > 0 && allFilteredIds.every((id) => sel.has(id));

  const startEdit = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setEditing(id);
    setBuyCurrency(p.buyPriceUsd && !p.buyPrice ? "USD" : "UZS");
    const a = p.attributes || {};
    const v = a.voltage || "12V";
    const isPreset = VOLTAGE_OPTIONS.includes(v);
    const buyUsd =
      p.buyPriceUsd ??
      (usdRate > 0 && p.buyPrice > 0 ? Number((p.buyPrice / usdRate).toFixed(2)) : 0);
    const sellUsd =
      p.sellPriceUsd ??
      (usdRate > 0 && p.sellPrice > 0 ? Number((p.sellPrice / usdRate).toFixed(2)) : 0);
    const attrVehicles = (p.attributes as { vehicles?: string[] } | undefined)?.vehicles;
    const initialVehicles =
      Array.isArray(p.vehicles) && p.vehicles.length > 0
        ? p.vehicles
        : Array.isArray(attrVehicles) && attrVehicles.length > 0
          ? attrVehicles
          : p.vehicle
            ? p.vehicle
                .split(/,\s*/)
                .map((s) => s.trim())
                .filter(Boolean)
            : vehicleBrands[0]
              ? [vehicleBrands[0]]
              : [];
    setForm({
      name: p.name,
      vehicles: initialVehicles,
      vehicle: p.vehicle || initialVehicles.join(", "),
      category: p.category || categories[0] || "Dvigatel",
      buyPrice: p.buyPrice,
      buyPriceUsd: buyUsd,
      sellPrice: p.sellPrice || p.buyPrice,
      sellPriceUsd: sellUsd || buyUsd,
      quantity: p.quantity,
      minQty: p.minQty,
      unitBrand: a.unitBrand || "Xitoy",
      amperage: a.amperage || "",
      voltage: isPreset ? v : "custom",
      customVoltage: isPreset ? "" : v,
      tireSize: a.tireSize || "",
      tireSeason: a.tireSeason || "Universal",
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error(t("products.nameRequired"));
      return;
    }
    if (categories.length === 0) {
      toast.error(t("products.categoriesNotLoaded"));
      return;
    }
    const category = categories.includes(form.category)
      ? form.category
      : categories[0] || "Dvigatel";
    const selectedVehicles =
      form.vehicles.length > 0
        ? Array.from(new Set(form.vehicles.filter(Boolean)))
        : vehicleBrands[0]
          ? [vehicleBrands[0]]
          : ["Barchasi"];
    const vehicleString = selectedVehicles.join(", ");
    const attributes: ProductAttributes = {};
    if (form.unitBrand.trim()) attributes.unitBrand = form.unitBrand.trim();
    if (isBattery(category)) {
      if (!form.amperage.trim()) {
        toast.error(t("products.batteryRequired"));
        return;
      }
      attributes.amperage = form.amperage.trim();
      const finalVoltage =
        form.voltage === "custom"
          ? form.customVoltage.trim() || "Boshqa"
          : form.voltage.trim() || "12V";
      attributes.voltage = finalVoltage;
    }
    if (isTire(category)) {
      if (!form.tireSize.trim()) {
        toast.error(t("products.tireSizeRequired"));
        return;
      }
      attributes.tireSize = form.tireSize.trim();
      attributes.tireSeason = form.tireSeason;
    }
    const payload = {
      name: form.name.trim(),
      barcode: "",
      sku: "",
      vehicle: vehicleString,
      vehicles: selectedVehicles,
      category,
      supplierId: editing
        ? products.find((product) => product.id === editing)?.supplierId || null
        : null,
      buyPrice: form.buyPrice,
      buyPriceUsd: form.buyPriceUsd,
      sellPrice: form.sellPrice || form.buyPrice,
      sellPriceUsd: form.sellPriceUsd || form.buyPriceUsd,
      quantity: form.quantity,
      minQty: form.minQty,
      attributes: Object.keys(attributes).length ? attributes : undefined,
    };
    if (editing) {
      updateProduct(editing, payload);
      toast.success(t("products.updated"));
    } else {
      addProduct({ id: `prd_${Math.random().toString(36).slice(2, 9)}`, ...payload });
      setServerPage(1);
      toast.success(t("products.created"));
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyForm(categories[0] || "Dvigatel", vehicleBrands[0] || ""));
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
      description:
        names.slice(0, 5).join(", ") + (names.length > 5 ? `, +${names.length - 5}` : ""),
      action: { label: t("common.undo"), onClick: () => snaps.forEach((p) => addProduct(p)) },
    });
  };

  const exportHeaders = () => [
    { label: t("common.name"), key: "name" },
    { label: t("products.brandModel"), key: "vehicle" },
    { label: t("products.category"), key: "category" },
    { label: t("products.stockQty"), key: "quantity" },
    { label: t("products.buyPrice"), key: "buyPrice" },
  ];

  const handleExportCSV = () => {
    const dataToExport = allFilteredProducts.length > 0 ? allFilteredProducts : products;
    exportToCSV(
      dataToExport,
      exportHeaders(),
      `tovarlar_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success(`${dataToExport.length} ta tovar CSV formatida yuklab olindi`);
  };

  const handleExportExcel = () => {
    const dataToExport = allFilteredProducts.length > 0 ? allFilteredProducts : products;
    const headers = exportHeaders().map((h, i) =>
      i === 4 ? { ...h, label: t("products.buyPriceSom") } : h,
    );
    exportToExcel(
      dataToExport,
      headers,
      t("products.exportListTitle"),
      `tovarlar_${new Date().toISOString().slice(0, 10)}.xls`,
    );
    toast.success(`${dataToExport.length} ta tovar Excel formatida yuklab olindi`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {confirmNode}
      <PageHeader
        title={t("products.title")}
        subtitle={`${products.length} ${t("products.count")}`}
        actions={
          <>
            <ProductImportDialog />
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
                setBuyCurrency("UZS");
                setForm(emptyForm(categories[0] || "Dvigatel", vehicleBrands[0] || ""));
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("products.new")}
            </Button>

            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) {
                  setEditing(null);
                  setForm(emptyForm(categories[0] || "Dvigatel", vehicleBrands[0] || ""));
                }
              }}
            >
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border rounded-2xl shadow-elevated">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">
                    {editing ? "Tovarni tahrirlash" : "Yangi tovar"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Nomi */}
                  <div>
                    <Label className="text-sm font-semibold text-foreground">Nomi *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Masalan: Tormoz kolodkasi"
                      className="mt-1"
                    />
                  </div>

                  {/* Mos keladigan avtomobillar */}
                  <div className="space-y-2 border rounded-2xl p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-foreground text-xs uppercase tracking-wider">
                        MOS KELADIGAN AVTOMOBILLAR (MASHINALARNI TANLANG) *
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs font-semibold text-foreground hover:text-primary px-2"
                        onClick={() => {
                          if (form.vehicles.length === vehicleBrands.length) {
                            setForm((f) => ({ ...f, vehicles: [], vehicle: "" }));
                          } else {
                            setForm((f) => ({
                              ...f,
                              vehicles: [...vehicleBrands],
                              vehicle: vehicleBrands.join(", "),
                            }));
                          }
                        }}
                      >
                        {form.vehicles.length === vehicleBrands.length
                          ? "Bekor qilish"
                          : "Barchasini tanlash"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {vehicleBrands.map((b) => {
                        const isSelected = form.vehicles.includes(b);
                        return (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? form.vehicles.filter((v) => v !== b)
                                : [...form.vehicles, b];
                              setForm((f) => ({
                                ...f,
                                vehicles: next,
                                vehicle: next.join(", "),
                              }));
                            }}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-semibold shadow-sm"
                                : "bg-background hover:bg-muted text-foreground border-border/80"
                            }`}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white/20" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <span>{b}</span>
                          </button>
                        );
                      })}
                    </div>

                    {form.vehicles.length > 0 && (
                      <div className="text-xs text-muted-foreground pt-2 flex flex-wrap gap-1 items-center">
                        <span>Tanlangan mashinalar ({form.vehicles.length}):</span>
                        <span className="font-semibold text-foreground">
                          {form.vehicles.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Kategoriya (Searchable Combobox) */}
                  <div>
                    <Label className="text-sm font-semibold text-foreground">Kategoriya</Label>
                    <Popover open={categoryComboOpen} onOpenChange={setCategoryComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryComboOpen}
                          className="w-full justify-between mt-1 h-9 px-3 text-left font-normal bg-card hover:bg-muted/40 border-border"
                        >
                          <span className="truncate">
                            {form.category || "Kategoriyani tanlang..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] min-w-[240px] p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Kategoriya qidirish..." autoFocus />
                          <CommandList className="max-h-60 overflow-y-auto">
                            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                              Kategoriya topilmadi
                            </CommandEmpty>
                            <CommandGroup>
                              {sortedCategories.map((c) => (
                                <CommandItem
                                  key={c}
                                  value={c}
                                  onSelect={() => {
                                    setForm({ ...form, category: c });
                                    setCategoryComboOpen(false);
                                  }}
                                  className="cursor-pointer hover:bg-accent/40 flex items-center justify-between py-2 px-3 text-sm"
                                >
                                  <span className="font-medium">{c}</span>
                                  <Check
                                    className={cn(
                                      "h-4 w-4 text-primary ml-2",
                                      form.category === c ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Mahsulot brendi */}
                  <div>
                    <Label className="text-sm font-semibold text-foreground">
                      Mahsulot brendi (ixtiyoriy)
                    </Label>
                    <Input
                      value={form.unitBrand}
                      onChange={(e) => setForm({ ...form, unitBrand: e.target.value })}
                      placeholder="Xitoy"
                      className="mt-1"
                    />
                  </div>

                  {/* Akkumulyator yoki Shina xususiyatlari */}
                  {isBattery(form.category) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border rounded-xl bg-muted/10">
                      <div>
                        <Label className="text-sm font-semibold">
                          {t("products.form.amperage")}
                        </Label>
                        <Input
                          value={form.amperage}
                          onChange={(e) => setForm({ ...form, amperage: e.target.value })}
                          placeholder="60, 75, 100"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">
                          {t("products.form.voltage")}
                        </Label>
                        <Select
                          value={form.voltage}
                          onValueChange={(v) => setForm({ ...form, voltage: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VOLTAGE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">Boshqa (Erkin qiymat)</SelectItem>
                          </SelectContent>
                        </Select>
                        {form.voltage === "custom" && (
                          <Input
                            value={form.customVoltage}
                            onChange={(e) => setForm({ ...form, customVoltage: e.target.value })}
                            placeholder="Masalan: 96V, 100V, Yig'ma batareya..."
                            className="mt-2"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {isTire(form.category) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border rounded-xl bg-muted/10">
                      <div>
                        <Label className="text-sm font-semibold">
                          {t("products.form.tireSize")}
                        </Label>
                        <Input
                          value={form.tireSize}
                          onChange={(e) => setForm({ ...form, tireSize: e.target.value })}
                          placeholder="175/70 R13"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">{t("products.form.season")}</Label>
                        <Select
                          value={form.tireSeason}
                          onValueChange={(v) => setForm({ ...form, tireSeason: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yozgi">{t("products.tire.summer")}</SelectItem>
                            <SelectItem value="Qishki">{t("products.tire.winter")}</SelectItem>
                            <SelectItem value="Universal">
                              {t("products.tire.universal")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Miqdor va Eslatma (Min. miqdor) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold text-foreground">Miqdor</Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.quantity || ""}
                        placeholder="0"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            quantity: e.target.value === "" ? 0 : Math.max(0, +e.target.value),
                          })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-foreground">
                        Eslatma (Min. miqdor)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.minQty || ""}
                        placeholder="0"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            minQty: e.target.value === "" ? 0 : Math.max(0, +e.target.value),
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Narxlar (Faqat Sotib olish) */}
                  <div className="border rounded-2xl p-4 bg-muted/10 space-y-3">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                      <span className="text-emerald-600 font-bold">$</span>
                      <span>Narxlar (So'm va Dollar $)</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Sotib olish</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step={buyCurrency === "USD" ? "0.01" : "1"}
                          min="0"
                          value={
                            buyCurrency === "UZS" ? form.buyPrice || "" : form.buyPriceUsd || ""
                          }
                          onChange={(e) => {
                            const val = Math.max(0, +e.target.value);
                            if (buyCurrency === "UZS") {
                              setForm((f) => ({
                                ...f,
                                buyPrice: val,
                                buyPriceUsd: usdRate > 0 ? Number((val / usdRate).toFixed(2)) : 0,
                                sellPrice: val,
                                sellPriceUsd: usdRate > 0 ? Number((val / usdRate).toFixed(2)) : 0,
                              }));
                            } else {
                              setForm((f) => ({
                                ...f,
                                buyPriceUsd: val,
                                buyPrice: Math.round(val * usdRate),
                                sellPriceUsd: val,
                                sellPrice: Math.round(val * usdRate),
                              }));
                            }
                          }}
                          placeholder="0"
                          className="flex-1"
                        />
                        <Select
                          value={buyCurrency}
                          onValueChange={(v: "UZS" | "USD") => setBuyCurrency(v)}
                        >
                          <SelectTrigger className="w-[130px] shrink-0 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UZS">So'm (UZS)</SelectItem>
                            <SelectItem value="USD">Dollar ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-3">
                  <Button
                    onClick={submit}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-xl"
                  >
                    Saqlash
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* Ombor Umumiy Qiymati */}
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

      <Card className="p-4 rounded-2xl card-elevated border-border/60">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 mb-4">
          <div className="relative flex-1 min-w-45">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("products.search")}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={veh} onValueChange={setVeh}>
            <SelectTrigger className="sm:w-45">
              <SelectValue placeholder={t("products.brand")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("products.allBrands")}</SelectItem>
              {vehicleBrands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-45">
              <SelectValue placeholder={t("products.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("products.allCategories")}</SelectItem>
              {sortedCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <BulkBar
          count={sel.count}
          onDelete={removeBulk}
          onClear={sel.clear}
          label={t("products.bulk")}
        />

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) => sel.toggleAll(allFilteredIds, !!v)}
                    aria-label={t("common.selectAll")}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label={t("common.name")}
                    sortKey="name"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortButton
                    label={t("common.brand")}
                    sortKey="vehicle"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  />
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <SortButton
                    label={t("products.category")}
                    sortKey="category"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton
                    label={t("products.qty")}
                    sortKey="quantity"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton
                    label={t("products.buyPrice")}
                    sortKey="buyPrice"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  />
                </TableHead>
                <TableHead className="hidden sm:table-cell text-center">
                  {t("common.status")}
                </TableHead>
                <TableHead className="sticky right-0 z-20 bg-muted/30 text-right pr-4">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    {t("products.notFound")}
                  </TableCell>
                </TableRow>
              )}
              {pg.paged.map((p) => (
                <TableRow
                  key={p.id}
                  className="group/row hover:bg-muted/40 transition-colors"
                  data-state={sel.has(p.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <SelectCell checked={sel.has(p.id)} onChange={() => sel.toggle(p.id)} />
                  </TableCell>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center shrink-0">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-foreground text-sm">
                          {p.name}
                          {p.attributes?.amperage && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              · {p.attributes.amperage}Ah {p.attributes.voltage}
                            </span>
                          )}
                          {p.attributes?.tireSize && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              · {p.attributes.tireSize}{" "}
                              {p.attributes.tireSeason && p.attributes.tireSeason !== "Universal"
                                ? `(${p.attributes.tireSeason})`
                                : ""}
                            </span>
                          )}
                          {p.attributes?.unitBrand && (
                            <span className="ml-2 text-xs font-semibold text-primary">
                              {p.attributes.unitBrand}
                            </span>
                          )}
                        </div>
                        <div className="sm:hidden text-xs text-muted-foreground font-normal mt-0.5">
                          {p.vehicle} · {p.category}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-medium">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {(p.vehicles && p.vehicles.length > 0
                        ? p.vehicles
                        : p.vehicle
                          ? p.vehicle.split(/,\s*/)
                          : []
                      )
                        .slice(0, 3)
                        .map((v) => (
                          <span
                            key={v}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border/80"
                          >
                            {v}
                          </span>
                        ))}
                      {(p.vehicles || (p.vehicle ? p.vehicle.split(/,\s*/) : [])).length > 3 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                          +{(p.vehicles || (p.vehicle ? p.vehicle.split(/,\s*/) : [])).length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{p.category}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {p.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-semibold whitespace-nowrap">
                    {formatPriceBoth(p.buyPrice, p.buyPriceUsd, usdRate, p.currency)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center">
                    <StatusBadge qty={p.quantity} min={p.minQty} />
                  </TableCell>
                  <TableCell className="sticky right-0 z-10 whitespace-nowrap bg-background text-right pr-4 group-hover/row:bg-muted/40">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("common.edit")}
                      onClick={() => startEdit(p.id)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("common.delete")}
                      onClick={() => removeOne(p.id, p.name)}
                      className="h-8 w-8 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginationBar {...pg} />
      </Card>
    </div>
  );
}
