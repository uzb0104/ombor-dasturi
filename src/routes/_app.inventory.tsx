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
  StatCard,
  StatusBadge,
  useConfirm,
  usePagination,
  PaginationBar,
  useSelection,
  BulkBar,
  SelectCell,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom, formatNumber } from "@/lib/constants";
import {
  Package,
  Warehouse,
  AlertTriangle,
  Car,
  ChevronLeft,
  Search,
  Edit,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/inventory")({ component: InventoryPage });

function InventoryPage() {
  const t = useT();
  const { products, vehicleBrands, deleteProduct } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  const total = products.reduce((a, p) => a + p.buyPrice * p.quantity, 0);
  const low = products.filter((p) => p.quantity <= p.minQty).length;

  const brandStats = useMemo(
    () =>
      vehicleBrands.map((b: string) => {
        const items = products.filter((p) => p.vehicle === b);
        return {
          brand: b,
          count: items.length,
          qty: items.reduce((a, p) => a + p.quantity, 0),
          value: items.reduce((a, p) => a + p.buyPrice * p.quantity, 0),
          low: items.filter((p) => p.quantity <= p.minQty).length,
        };
      }),
    [products, vehicleBrands],
  );

  const brandProducts = useMemo(() => {
    if (!selected) return [];
    const s = search.toLowerCase();
    return products
      .filter((p) => p.vehicle === selected)
      .filter(
        (p) => !search || p.name.toLowerCase().includes(s) || (p.barcode || "").includes(search),
      );
  }, [products, selected, search]);

  const pg = usePagination(brandProducts, 12);
  const pageIds = pg.paged.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => sel.has(id));

  const removeOne = async (id: string, name: string) => {
    const ok = await confirm({
      title: t("common.delete"),
      description: `"${name}"?`,
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (ok) {
      deleteProduct(id);
      toast.success(t("toast.deleted"));
    }
  };
  const removeBulk = async () => {
    const ok = await confirm({
      title: t("common.delete"),
      description: `${sel.count}`,
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    const n = sel.count;
    sel.selected.forEach((id) => deleteProduct(id));
    sel.clear();
    toast.success(t("toast.deletedMany", { n }));
  };

  if (selected) {
    return (
      <div className="space-y-5">
        {confirmNode}
        <PageHeader
          title={selected}
          subtitle={t("inventory.brandCount", { n: brandProducts.length })}
          actions={
            <Button
              variant="outline"
              onClick={() => {
                setSelected(null);
                setSearch("");
                sel.clear();
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("dashboard.backBrands")}
            </Button>
          }
        />
        <Card className="p-4 rounded-2xl">
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("dashboard.searchProduct")}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <BulkBar
            count={sel.count}
            onDelete={removeBulk}
            onClear={sel.clear}
            label={t("inventory.bulk")}
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)}
                    />
                  </TableHead>
                  <TableHead>{t("products.title")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("products.category")}</TableHead>
                  <TableHead className="text-right">{t("products.qty")}</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">
                    {t("products.buyPrice")}
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-right">
                    {t("products.sellPrice")}
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-right">
                    {t("dashboard.totalValue")}
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.paged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      {t("dashboard.noBrandProducts")}
                    </TableCell>
                  </TableRow>
                )}
                {pg.paged.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-muted/40"
                    data-state={sel.has(p.id) ? "selected" : undefined}
                  >
                    <TableCell>
                      <SelectCell checked={sel.has(p.id)} onChange={() => sel.toggle(p.id)} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.name}
                      <div className="md:hidden text-xs text-muted-foreground">{p.category}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums text-sm">
                      {formatSom(p.buyPrice)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums text-sm">
                      {formatSom(p.sellPrice)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums text-sm font-semibold">
                      {formatSom(p.buyPrice * p.quantity)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge qty={p.quantity} min={p.minQty} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" disabled title={t("inventory.editHint")}>
                        <Edit className="h-4 w-4 opacity-30" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeOne(p.id, p.name)}>
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

  return (
    <div className="space-y-5">
      <PageHeader title={t("inventory.title")} subtitle={t("inventory.subtitle")} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label={t("dashboard.warehouseValue")}
          value={formatSom(total)}
          icon={Warehouse}
          accent="primary"
        />
        <StatCard
          label={t("dashboard.totalProducts")}
          value={formatNumber(products.length)}
          icon={Package}
          accent="info"
        />
        <StatCard
          label={t("dashboard.lowCount")}
          value={String(low)}
          icon={AlertTriangle}
          accent="destructive"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {brandStats.map((b) => (
          <button
            key={b.brand}
            onClick={() => setSelected(b.brand)}
            className="text-left group rounded-2xl border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all animate-fade-in"
          >
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Car className="h-6 w-6" />
              </div>
              {b.low > 0 && (
                <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-medium">
                  {t("inventory.lowBadge", { n: b.low })}
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-lg font-bold tracking-tight">{b.brand}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t("inventory.summaryLine", { count: b.count, qty: formatNumber(b.qty) })}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-sm">
              <span className="text-muted-foreground">{t("inventory.valueLabel")} </span>
              <span className="font-semibold">{formatSom(b.value)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
