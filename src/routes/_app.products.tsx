import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatusBadge, useConfirm, usePagination, PaginationBar, useSelection, BulkBar, SelectCell, useSortableData, SortButton, exportToCSV, exportToExcel } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { useMemo, useState } from "react";
import { Plus, Search, Edit, Trash2, Package, ScanBarcode, Download, History } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ProductImportDialog } from "@/components/ProductImportDialog";
import { PriceHistoryDialog } from "@/components/PriceHistoryDialog";
import type { Product } from "@/lib/mock-data";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

type FormState = {
  name: string; barcode: string;
  vehicle: string; category: string;
  supplierId: string; buyPrice: number; sellPrice: number; quantity: number; minQty: number;
  unitBrand: string; amperage: string; voltage: string; tireSize: string; tireSeason: string;
};

const emptyForm = (firstCategory: string, firstBrand: string): FormState => ({
  name: "", barcode: "",
  vehicle: firstBrand,
  category: firstCategory,
  supplierId: "", buyPrice: 0, sellPrice: 0, quantity: 0, minQty: 5,
  unitBrand: "", amperage: "", voltage: "12V", tireSize: "", tireSeason: "Universal",
});

const isBattery = (cat: string) => /akkumulyator/i.test(cat);
const isTire = (cat: string) => /shina|balon/i.test(cat);

function ProductsPage() {
  const t = useT();
  const { products, suppliers, categories, vehicleBrands, addProduct, updateProduct, deleteProduct, vehicleFilter } = useStore();
  const [search, setSearch] = useState("");
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [cat, setCat] = useState<string>("all");
  const [veh, setVeh] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(categories[0] || "", vehicleBrands[0] || ""));
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  const filtered = useMemo(() => products.filter(p => {
    const s = search.toLowerCase();
    if (search && !p.name.toLowerCase().includes(s) && !(p.barcode || "").includes(search)) return false;
    if (cat !== "all" && p.category !== cat) return false;
    const v = veh !== "all" ? veh : vehicleFilter !== "all" ? vehicleFilter : null;
    if (v && p.vehicle !== v) return false;
    return true;
  }), [products, search, cat, veh, vehicleFilter]);

  // Sorting
  const { items: sortedProducts, sortConfig, requestSort } = useSortableData(filtered);

  // Pagination
  const pg = usePagination(sortedProducts, 12);
  const pageIds = pg.paged.map(p => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => sel.has(id));

  const startEdit = (id: string) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    setEditing(id);
    const a = p.attributes || {};
    setForm({
      name: p.name, barcode: p.barcode || "",
      vehicle: p.vehicle, category: p.category,
      supplierId: p.supplierId, buyPrice: p.buyPrice, sellPrice: p.sellPrice,
      quantity: p.quantity, minQty: p.minQty,
      unitBrand: a.unitBrand || "", amperage: a.amperage || "",
      voltage: a.voltage || "12V", tireSize: a.tireSize || "", tireSeason: a.tireSeason || "Universal",
    });
    setOpen(true);
  };

  const generateBarcode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    do {
      const len = 5 + Math.floor(Math.random() * 4);
      code = Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    } while (products.some(p => p.barcode === code));
    setForm(f => ({ ...f, barcode: code }));
    toast.success(t("products.codeGenerated"));
  };

  const submit = () => {
    if (!form.name.trim()) { toast.error(t("products.nameRequired")); return; }
    if (categories.length === 0) { toast.error(t("products.categoriesNotLoaded")); return; }
    if (vehicleBrands.length === 0) { toast.error(t("products.brandsNotLoaded")); return; }
    const category = categories.includes(form.category) ? form.category : categories[0];
    const vehicle = vehicleBrands.includes(form.vehicle) ? form.vehicle : vehicleBrands[0];
    const bc = form.barcode.trim().toUpperCase();
    if (bc) {
      const dup = products.find(p => p.barcode === bc && p.id !== editing);
      if (dup) { toast.error(t("products.codeExists", { name: dup.name })); return; }
    }
    const attributes: any = {};
    if (form.unitBrand.trim()) attributes.unitBrand = form.unitBrand.trim();
    if (isBattery(category)) {
      if (!form.amperage.trim()) { toast.error(t("products.batteryRequired")); return; }
      attributes.amperage = form.amperage.trim();
      attributes.voltage = form.voltage.trim() || "12V";
    }
    if (isTire(category)) {
      if (!form.tireSize.trim()) { toast.error(t("products.tireSizeRequired")); return; }
      attributes.tireSize = form.tireSize.trim();
      attributes.tireSeason = form.tireSeason;
    }
    const payload = {
      name: form.name, barcode: bc, sku: "",
      vehicle, category,
      supplierId: form.supplierId || suppliers[0]?.id || null,
      buyPrice: form.buyPrice, sellPrice: form.sellPrice,
      quantity: form.quantity, minQty: form.minQty,
      attributes: Object.keys(attributes).length ? attributes : undefined,
    };
    if (editing) {
      updateProduct(editing, payload);
      toast.success(t("products.updated"));
    } else {
      addProduct({ id: `prd_${Math.random().toString(36).slice(2, 9)}`, ...payload });
      toast.success(t("products.created"));
    }
    setOpen(false); setEditing(null); setForm(emptyForm(categories[0] || "", vehicleBrands[0] || ""));
  };

  const removeOne = async (id: string, name: string) => {
    const ok = await confirm({ title: t("products.deleteTitle"), description: t("products.deleteDesc", { name }), destructive: true, confirmText: t("common.delete") });
    if (!ok) return;
    const snap = products.find(p => p.id === id);
    deleteProduct(id);
    toast.success(`${t("toast.deleted")}: ${name}`, {
      action: snap ? { label: t("common.undo"), onClick: () => addProduct(snap) } : undefined,
    });
  };

  const removeBulk = async () => {
    const ok = await confirm({ title: t("common.bulkDelete"), description: t("products.bulkDeleteDesc", { n: sel.count }), destructive: true, confirmText: t("common.delete") });
    if (!ok) return;
    const snaps = products.filter(p => sel.has(p.id));
    const names = snaps.map(p => p.name);
    snaps.forEach(p => deleteProduct(p.id));
    sel.clear();
    toast.success(t("toast.deletedMany", { n: snaps.length }), {
      description: names.slice(0, 5).join(", ") + (names.length > 5 ? `, +${names.length - 5}` : ""),
      action: { label: t("common.undo"), onClick: () => snaps.forEach(p => addProduct(p)) },
    });
  };

  const exportHeaders = () => [
    { label: t("common.name"), key: "name" },
    { label: t("products.boxCode"), key: "barcode" },
    { label: t("products.brandModel"), key: "vehicle" },
    { label: t("products.category"), key: "category" },
    { label: t("products.stockQty"), key: "quantity" },
    { label: t("products.buyPrice"), key: "buyPrice" },
    { label: t("products.sellPriceLabel"), key: "sellPrice" },
  ];

  const handleExportCSV = () => {
    exportToCSV(filtered, exportHeaders(), `tovarlar_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportExcel = () => {
    const headers = exportHeaders().map((h, i) =>
      i === 5 ? { ...h, label: t("products.buyPriceSom") } : i === 6 ? { ...h, label: t("products.sellPriceSom") } : h
    );
    exportToExcel(filtered, headers, t("products.exportListTitle"), `tovarlar_${new Date().toISOString().slice(0, 10)}.xls`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {confirmNode}
      <PriceHistoryDialog
        product={historyProduct}
        open={!!historyProduct}
        onOpenChange={(v) => !v && setHistoryProduct(null)}
      />
      <PageHeader
        title={t("products.title")}
        subtitle={`${products.length} ${t("products.count")}`}
        actions={
          <>
            <ProductImportDialog />
            <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm(categories[0] || "", vehicleBrands[0] || "")); } }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("products.new")}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border rounded-2xl shadow-elevated">
                <DialogHeader><DialogTitle>{editing ? t("products.edit") : t("products.new")}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                  <div className="sm:col-span-2"><Label>{t("common.nameStar")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("products.form.namePh")} /></div>
                  <div className="sm:col-span-2">
                    <Label>{t("products.form.codeLabel")}</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={form.barcode}
                        onChange={(e) => setForm({ ...form, barcode: e.target.value.toUpperCase() })}
                        placeholder={t("products.form.codePh")}
                        className="font-mono uppercase tracking-wider text-sm"
                        autoFocus={!editing}
                      />
                      <Button type="button" variant="outline" onClick={generateBarcode}>
                        <ScanBarcode className="h-4 w-4 mr-1" />{t("common.generate")}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{t("products.form.codeHint")}</p>
                  </div>
                  <div><Label>{t("products.brand")}</Label>
                    <Select value={form.vehicle} onValueChange={(v) => setForm({ ...form, vehicle: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{vehicleBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t("products.category")}</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2"><Label>{t("common.supplier")}</Label>
                    <Select value={form.supplierId || suppliers[0]?.id} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2"><Label>{t("products.form.unitBrand")}</Label>
                    <Input value={form.unitBrand} onChange={(e) => setForm({ ...form, unitBrand: e.target.value })} placeholder={t("products.form.unitBrandPh")} className="mt-1" />
                  </div>
                  {isBattery(form.category) && (
                    <>
                      <div><Label>{t("products.form.amperage")}</Label>
                        <Input value={form.amperage} onChange={(e) => setForm({ ...form, amperage: e.target.value })} placeholder="60, 75, 100" className="mt-1" />
                      </div>
                      <div><Label>{t("products.form.voltage")}</Label>
                        <Select value={form.voltage} onValueChange={(v) => setForm({ ...form, voltage: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6V">6V</SelectItem>
                            <SelectItem value="12V">12V</SelectItem>
                            <SelectItem value="24V">24V</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {isTire(form.category) && (
                    <>
                      <div><Label>{t("products.form.tireSize")}</Label>
                        <Input value={form.tireSize} onChange={(e) => setForm({ ...form, tireSize: e.target.value })} placeholder="175/70 R13" className="mt-1" />
                      </div>
                      <div><Label>{t("products.form.season")}</Label>
                        <Select value={form.tireSeason} onValueChange={(v) => setForm({ ...form, tireSeason: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yozgi">{t("products.tire.summer")}</SelectItem>
                            <SelectItem value="Qishki">{t("products.tire.winter")}</SelectItem>
                            <SelectItem value="Universal">{t("products.tire.universal")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div><Label>{t("products.qty")}</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} className="mt-1" /></div>
                  <div><Label>{t("common.minQty")}</Label><Input type="number" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: +e.target.value })} className="mt-1" /></div>
                  <div><Label>{t("products.buyPrice")}</Label><Input type="number" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: +e.target.value })} className="mt-1" /></div>
                  <div><Label>{t("products.sellPrice")}</Label><Input type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: +e.target.value })} className="mt-1" /></div>
                </div>
                <DialogFooter><Button onClick={submit}>{t("common.save")}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Card className="p-4 rounded-2xl card-elevated border-border/60">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("products.search")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={veh} onValueChange={setVeh}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue placeholder={t("products.brand")} /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("products.allBrands")}</SelectItem>{vehicleBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue placeholder={t("products.category")} /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("products.allCategories")}</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <BulkBar count={sel.count} onDelete={removeBulk} onClear={sel.clear} label={t("products.bulk")} />

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)} aria-label={t("common.selectAll")} />
                </TableHead>
                <TableHead>
                  <SortButton label={t("common.name")} sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <SortButton label={t("common.code")} sortKey="barcode" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortButton label={t("common.brand")} sortKey="vehicle" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <SortButton label={t("products.category")} sortKey="category" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton label={t("products.qty")} sortKey="quantity" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="hidden md:table-cell text-right">
                  <SortButton label={t("products.buyPrice")} sortKey="buyPrice" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton label={t("products.sellPrice")} sortKey="sellPrice" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="hidden sm:table-cell text-center">{t("common.status")}</TableHead>
                <TableHead className="text-right pr-4">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">{t("products.notFound")}</TableCell></TableRow>
              )}
              {pg.paged.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/40 transition-colors" data-state={sel.has(p.id) ? "selected" : undefined}>
                  <TableCell><SelectCell checked={sel.has(p.id)} onChange={() => sel.toggle(p.id)} /></TableCell>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="min-w-0">
                        <div className="truncate text-foreground text-sm">
                          {p.name}
                          {p.attributes?.amperage && <span className="ml-2 text-xs font-normal text-muted-foreground">· {p.attributes.amperage}Ah {p.attributes.voltage}</span>}
                          {p.attributes?.tireSize && <span className="ml-2 text-xs font-normal text-muted-foreground">· {p.attributes.tireSize} {p.attributes.tireSeason && p.attributes.tireSeason !== "Universal" ? `(${p.attributes.tireSeason})` : ""}</span>}
                          {p.attributes?.unitBrand && <span className="ml-2 text-xs font-semibold text-primary">{p.attributes.unitBrand}</span>}
                        </div>
                        <div className="sm:hidden text-xs text-muted-foreground font-normal mt-0.5">{p.vehicle} · {p.category}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs font-mono uppercase text-muted-foreground">
                    {p.barcode ? p.barcode : <span className="italic normal-case font-sans">{t("products.noCode")}</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-medium">{p.vehicle}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{p.category}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{p.quantity}</TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums text-sm text-muted-foreground">{formatSom(p.buyPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-bold text-foreground">{formatSom(p.sellPrice)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-center"><StatusBadge qty={p.quantity} min={p.minQty} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap pr-4">
                    <Button variant="ghost" size="icon" title={t("products.priceHistory")} onClick={() => setHistoryProduct(p)} className="h-8 w-8">
                      <History className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(p.id)} className="h-8 w-8"><Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeOne(p.id, p.name)} className="h-8 w-8 hover:bg-destructive/10">
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
