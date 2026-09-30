import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  useConfirm,
  usePagination,
  PaginationBar,
  useSelection,
  BulkBar,
  SelectCell,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import type { IncomingStock } from "@/lib/types";
import { formatSom } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Trash2,
  Plus,
  Check,
  ChevronsUpDown,
  Edit,
  ChevronDown,
  ChevronRight,
  Phone,
  MapPin,
  Truck,
  PackagePlus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/incoming")({ component: IncomingPage });

// ─── Supplier form ──────────────────────────────────────────────────
type SupForm = {
  name: string;
  phone: string;
  address: string;
  deliveredProduct: string;
  deliveredQuantity: number;
};
const emptySupForm = (): SupForm => ({
  name: "",
  phone: "",
  address: "",
  deliveredProduct: "",
  deliveredQuantity: 0,
});

function IncomingPage() {
  const t = useT();
  const {
    incoming,
    products,
    suppliers,
    addIncoming,
    updateIncoming,
    deleteIncoming,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    usdRate,
  } = useStore();
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  // === Active tab: "incoming" | "suppliers" ===
  const [activeTab, setActiveTab] = useState<"incoming" | "suppliers">("incoming");

  // === Expanded supplier row ===
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);

  // === Supplier search ===
  const [supSearch, setSupSearch] = useState("");

  // === Supplier CRUD dialog ===
  const [supOpen, setSupOpen] = useState(false);
  const [supEditing, setSupEditing] = useState<string | null>(null);
  const [supForm, setSupForm] = useState<SupForm>(emptySupForm());

  // ── Incoming form state ──────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [buyPrice, setBuyPrice] = useState(0);
  const [buyPriceUsd, setBuyPriceUsd] = useState(0);
  const [buyCurrency, setBuyCurrency] = useState<"UZS" | "USD">("UZS");

  const [productComboOpen, setProductComboOpen] = useState(false);
  const [supplierComboOpen, setSupplierComboOpen] = useState(false);

  // ── Sorted incoming ─────────────────────────────────────────────
  const sorted = useMemo(
    () => [...incoming].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [incoming],
  );
  const pg = usePagination(sorted, 12);
  const pageIds = pg.paged.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => sel.has(id));

  // ── Filtered suppliers ───────────────────────────────────────────
  const filteredSuppliers = useMemo(() => {
    const s = supSearch.toLowerCase();
    return suppliers.filter((x) => !s || x.name.toLowerCase().includes(s) || x.phone.includes(s));
  }, [suppliers, supSearch]);

  // ── Incoming handlers ────────────────────────────────────────────
  const handleProductSelect = (pId: string) => {
    setProductId(pId);
    const p = products.find((x) => x.id === pId);
    if (p) {
      setBuyPrice(p.buyPrice);
      setBuyPriceUsd(
        p.buyPriceUsd ??
          (usdRate > 0 && p.buyPrice > 0 ? Number((p.buyPrice / usdRate).toFixed(2)) : 0),
      );
    }
  };

  const openNew = () => {
    setEditingId(null);
    setInvoice("");
    setSupplierId("");
    setProductId("");
    setQty(1);
    setBuyPrice(0);
    setBuyPriceUsd(0);
    setOpen(true);
  };

  const openEdit = (i: IncomingStock) => {
    setEditingId(i.id);
    setInvoice(i.invoice || "");
    setSupplierId(i.supplierId || "");
    setProductId(i.productId || "");
    setQty(i.qty || 1);
    setBuyPrice(i.buyPrice || 0);
    setBuyPriceUsd(usdRate > 0 && i.buyPrice > 0 ? Number((i.buyPrice / usdRate).toFixed(2)) : 0);
    setOpen(true);
  };

  const removeOne = async (id: string) => {
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

  const removeBulk = async () => {
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

  const handleSubmit = () => {
    if (!invoice.trim()) {
      toast.error(t("incoming.invoiceRequired"));
      return;
    }
    if (!supplierId) {
      toast.error(t("incoming.supplierRequired"));
      return;
    }
    if (!productId) {
      toast.error(t("incoming.productRequired"));
      return;
    }
    if (qty <= 0) {
      toast.error(t("toast.qtyMin"));
      return;
    }
    if (buyPrice < 0) {
      toast.error(t("incoming.priceNegative"));
      return;
    }

    if (editingId) {
      updateIncoming(editingId, { supplierId, productId, qty, buyPrice, invoice: invoice.trim() });
      toast.success("Kirim muvaffaqiyatli tahrirlandi");
    } else {
      addIncoming({
        id: `inc_${Math.random().toString(36).slice(2, 9)}`,
        date: new Date().toISOString(),
        supplierId,
        productId,
        qty,
        buyPrice,
        invoice: invoice.trim(),
      });
      toast.success(t("incoming.saved"));
    }
    setOpen(false);
    setInvoice("");
    setSupplierId("");
    setProductId("");
    setQty(1);
    setBuyPrice(0);
    setEditingId(null);
  };

  // ── Supplier handlers ────────────────────────────────────────────
  const startEditSupplier = (id: string) => {
    const s = suppliers.find((x) => x.id === id);
    if (!s) return;
    setSupEditing(id);
    setSupForm({
      name: s.name,
      phone: s.phone,
      address: s.address,
      deliveredProduct: s.deliveredProduct || "",
      deliveredQuantity: s.deliveredQuantity || 0,
    });
    setSupOpen(true);
  };

  const submitSupplier = () => {
    if (!supForm.name) {
      toast.error(t("suppliers.nameRequired"));
      return;
    }
    if (supEditing) {
      const s = suppliers.find((x) => x.id === supEditing);
      updateSupplier(supEditing, { ...supForm, debt: s ? s.debt : 0 });
      toast.success(t("toast.updated"));
    } else {
      addSupplier({
        id: `sup_${Math.random().toString(36).slice(2, 9)}`,
        ...supForm,
        debt: 0,
      });
      toast.success(t("toast.created"));
    }
    setSupOpen(false);
    setSupEditing(null);
    setSupForm(emptySupForm());
  };

  const removeSupplier = async (id: string, name: string) => {
    const ok = await confirm({
      title: t("common.delete"),
      description: t("common.deleteQuestion", { name }),
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (ok) {
      deleteSupplier(id);
      toast.success(t("toast.deleted"));
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {confirmNode}

      <PageHeader
        title="Kirimlar va Yetkazuvchilar"
        subtitle="Omborga kirgan tovarlar va yetkazib beruvchilar boshqaruvi"
        actions={
          <>
            {activeTab === "incoming" ? (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" /> {t("incoming.new")}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSupEditing(null);
                  setSupForm(emptySupForm());
                  setSupOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Yetkazuvchi qo'shish
              </Button>
            )}
          </>
        }
      />

      {/* ── Tab switcher ─────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit border border-border/40">
        <button
          onClick={() => setActiveTab("incoming")}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
            activeTab === "incoming"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <PackagePlus className="h-4 w-4" />
          Kirimlar
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {incoming.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
            activeTab === "suppliers"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Truck className="h-4 w-4" />
          Yetkazuvchilar
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {suppliers.length}
          </Badge>
        </button>
      </div>

      {/* ════════════════════ KIRIMLAR TAB ════════════════════ */}
      {activeTab === "incoming" && (
        <Card className="rounded-2xl p-3 md:p-4 card-elevated border-border/60">
          <BulkBar
            count={sel.count}
            onDelete={removeBulk}
            onClear={sel.clear}
            label={t("incoming.bulk")}
          />
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)}
                    />
                  </TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("common.invoice")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("common.supplier")}</TableHead>
                  <TableHead>{t("common.product")}</TableHead>
                  <TableHead className="text-right">{t("products.qty")}</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">
                    {t("common.price")}
                  </TableHead>
                  <TableHead className="text-right">{t("common.total")}</TableHead>
                  <TableHead className="text-right pr-4">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      Kirimlar topilmadi.
                    </TableCell>
                  </TableRow>
                ) : (
                  pg.paged.map((i) => {
                    const p = products.find((x) => x.id === i.productId);
                    const s = suppliers.find((x) => x.id === i.supplierId);
                    return (
                      <TableRow
                        key={i.id}
                        className="hover:bg-muted/40"
                        data-state={sel.has(i.id) ? "selected" : undefined}
                      >
                        <TableCell>
                          <SelectCell checked={sel.has(i.id)} onChange={() => sel.toggle(i.id)} />
                        </TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">
                          {new Date(i.date).toLocaleDateString("uz-UZ")}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="font-mono text-xs">
                            {i.invoice}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-medium">
                          {s?.name}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">{p?.name}</span>
                          <div className="md:hidden text-xs text-muted-foreground">{s?.name}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {i.qty}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-right tabular-nums text-sm">
                          {formatSom(i.buyPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-foreground">
                          {formatSom(i.buyPrice * i.qty)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(i)}
                              className="h-8 w-8 hover:bg-muted"
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOne(i.id)}
                              className="h-8 w-8 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
      )}

      {/* ════════════════════ YETKAZUVCHILAR TAB ════════════════════ */}
      {activeTab === "suppliers" && (
        <Card className="p-4 rounded-2xl card-elevated border-border/60">
          {/* Search */}
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("suppliers.searchPh")}
              className="pl-9"
              value={supSearch}
              onChange={(e) => setSupSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("common.phone")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("common.address")}</TableHead>
                  <TableHead className="text-right">Jami kirim</TableHead>
                  <TableHead className="text-right text-destructive">Qarz</TableHead>
                  <TableHead className="text-right pr-4">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      {t("suppliers.notFound")}
                    </TableCell>
                  </TableRow>
                )}
                {filteredSuppliers.map((s) => {
                  const supIncoming = incoming.filter((i) => i.supplierId === s.id);
                  const totalPurchased = supIncoming.reduce(
                    (sum, i) => sum + i.buyPrice * i.qty,
                    0,
                  );
                  const isExpanded = expandedSupplierId === s.id;

                  return (
                    <>
                      {/* ── Supplier row ── */}
                      <TableRow
                        key={s.id}
                        className="hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => setExpandedSupplierId(isExpanded ? null : s.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {s.name}
                          <div className="sm:hidden text-xs text-muted-foreground font-normal mt-0.5">
                            {s.phone}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          <Phone className="h-3 w-3 inline mr-1 opacity-50" />
                          {s.phone}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 inline mr-1 opacity-50" />
                          {s.address || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {totalPurchased > 0 ? formatSom(totalPurchased) : "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums font-bold",
                            s.debt > 0 ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {s.debt > 0 ? formatSom(s.debt) : "—"}
                        </TableCell>
                        <TableCell
                          className="text-right whitespace-nowrap pr-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditSupplier(s.id)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSupplier(s.id, s.name)}
                            className="h-8 w-8 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* ── Expanded: Kirim tarixi ── */}
                      {isExpanded && (
                        <TableRow key={`${s.id}-expanded`} className="bg-muted/10">
                          <TableCell colSpan={7} className="p-0">
                            <div className="px-6 py-3 border-t border-border/40">
                              <div className="flex items-center gap-2 mb-2">
                                <PackagePlus className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-foreground">
                                  {s.name} — kirim tarixi
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {supIncoming.length} ta yetkazma
                                </Badge>
                              </div>
                              {supIncoming.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">
                                  Hali kirim yo'q
                                </p>
                              ) : (
                                <div className="rounded-lg border border-border/40 overflow-hidden">
                                  <Table>
                                    <TableHeader className="bg-muted/20">
                                      <TableRow>
                                        <TableHead className="text-xs py-2">
                                          {t("common.date")}
                                        </TableHead>
                                        <TableHead className="text-xs py-2">
                                          {t("common.invoice")}
                                        </TableHead>
                                        <TableHead className="text-xs py-2">
                                          {t("common.product")}
                                        </TableHead>
                                        <TableHead className="text-xs py-2 text-right">
                                          {t("products.qty")}
                                        </TableHead>
                                        <TableHead className="text-xs py-2 text-right">
                                          {t("common.price")}
                                        </TableHead>
                                        <TableHead className="text-xs py-2 text-right">
                                          {t("common.total")}
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {[...supIncoming]
                                        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                                        .map((inc) => {
                                          const prod = products.find((p) => p.id === inc.productId);
                                          return (
                                            <TableRow key={inc.id} className="hover:bg-muted/20">
                                              <TableCell className="text-xs py-2 tabular-nums">
                                                {new Date(inc.date).toLocaleDateString("uz-UZ")}
                                              </TableCell>
                                              <TableCell className="text-xs py-2">
                                                <Badge
                                                  variant="outline"
                                                  className="font-mono text-[10px]"
                                                >
                                                  {inc.invoice}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="text-xs py-2 font-medium">
                                                {prod?.name || t("sales.unknownProduct")}
                                              </TableCell>
                                              <TableCell className="text-xs py-2 text-right tabular-nums font-semibold">
                                                {inc.qty}
                                              </TableCell>
                                              <TableCell className="text-xs py-2 text-right tabular-nums">
                                                {formatSom(inc.buyPrice)}
                                              </TableCell>
                                              <TableCell className="text-xs py-2 text-right tabular-nums font-bold">
                                                {formatSom(inc.buyPrice * inc.qty)}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ════════════ KIRIM DIALOG ════════════ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-card border rounded-2xl shadow-elevated p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {editingId ? (
                <Edit className="h-5 w-5 text-primary" />
              ) : (
                <Plus className="h-5 w-5 text-primary" />
              )}
              {editingId ? "Kirimni tahrirlash" : t("incoming.newFull")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Invoice */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("incoming.invoiceLabel")}
              </Label>
              <Input
                placeholder={t("incoming.invoicePh")}
                className="mt-1"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
              />
            </div>

            {/* Supplier */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("common.supplier")} *
              </Label>
              <div className="mt-1">
                <Popover open={supplierComboOpen} onOpenChange={setSupplierComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supplierComboOpen}
                      className="w-full justify-between font-normal text-left"
                    >
                      <span className="truncate">
                        {supplierId
                          ? suppliers.find((s) => s.id === supplierId)?.name
                          : t("incoming.searchSupplier")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t("incoming.searchSupplierPh")} />
                      <CommandEmpty>{t("incoming.supplierNotFound")}</CommandEmpty>
                      <CommandGroup>
                        <CommandList className="max-h-[200px]">
                          {suppliers.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={s.name}
                              onSelect={() => {
                                setSupplierId(s.id);
                                setSupplierComboOpen(false);
                              }}
                              className="cursor-pointer hover:bg-accent/40 flex items-center"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  supplierId === s.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{s.name}</span>
                                <span className="text-xs text-muted-foreground">{s.phone}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Product */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("common.product")} *
              </Label>
              <div className="mt-1">
                <Popover open={productComboOpen} onOpenChange={setProductComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productComboOpen}
                      className="w-full justify-between font-normal text-left"
                    >
                      <span className="truncate">
                        {productId
                          ? products.find((p) => p.id === productId)?.name
                          : t("sales.searchProduct")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t("sales.searchProductPh")} />
                      <CommandEmpty>{t("sales.productNotFound")}</CommandEmpty>
                      <CommandGroup>
                        <CommandList className="max-h-[200px]">
                          {products.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.name} ${p.sku}`}
                              onSelect={() => {
                                handleProductSelect(p.id);
                                setProductComboOpen(false);
                              }}
                              className="cursor-pointer hover:bg-accent/40 flex items-center justify-between"
                            >
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    productId === p.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{p.name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    SKU: {p.sku} · Model: {p.vehicle}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                                {t("common.inStock", { n: p.quantity })}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Qty & Dual Price */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("products.qty")}
                </Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, +e.target.value))}
                />
              </div>

              <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{t("incoming.incomingPrice")}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    1 $ = {usdRate || 12800} so'm
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step={buyCurrency === "USD" ? "0.01" : "1"}
                    min={0}
                    value={buyCurrency === "UZS" ? buyPrice || "" : buyPriceUsd || ""}
                    onChange={(e) => {
                      const val = Math.max(0, +e.target.value);
                      if (buyCurrency === "UZS") {
                        setBuyPrice(val);
                        setBuyPriceUsd(usdRate > 0 ? Number((val / usdRate).toFixed(2)) : 0);
                      } else {
                        setBuyPriceUsd(val);
                        setBuyPrice(Math.round(val * usdRate));
                      }
                    }}
                    placeholder="0"
                    className="flex-1"
                  />
                  <Select
                    value={buyCurrency}
                    onValueChange={(v: "UZS" | "USD") => setBuyCurrency(v)}
                  >
                    <SelectTrigger className="w-[110px] text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UZS">So'm (UZS)</SelectItem>
                      <SelectItem value="USD">Dollar ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-[11px] text-muted-foreground px-0.5 min-h-[16px]">
                  {buyCurrency === "UZS" ? (
                    buyPrice > 0 ? (
                      <span>
                        ≈ ${buyPriceUsd || (usdRate > 0 ? (buyPrice / usdRate).toFixed(2) : 0)} USD
                      </span>
                    ) : null
                  ) : buyPriceUsd > 0 ? (
                    <span>≈ {formatSom(buyPrice || Math.round(buyPriceUsd * usdRate))} so'm</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.back")}
            </Button>
            <Button onClick={handleSubmit}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════ YETKAZUVCHI DIALOG ════════════ */}
      <Dialog
        open={supOpen}
        onOpenChange={(v) => {
          setSupOpen(v);
          if (!v) {
            setSupEditing(null);
            setSupForm(emptySupForm());
          }
        }}
      >
        <DialogContent className="bg-card border rounded-2xl shadow-elevated p-6 max-w-md">
          <DialogHeader>
            <DialogTitle>{supEditing ? t("suppliers.edit") : t("suppliers.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>{t("common.nameStar")}</Label>
              <Input
                value={supForm.name}
                onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("common.phone")}</Label>
              <Input
                value={supForm.phone}
                onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("common.address")}</Label>
              <Input
                value={supForm.address}
                onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitSupplier}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
