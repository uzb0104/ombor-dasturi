import React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BulkBar,
  PaginationBar,
  SelectCell,
  SortButton,
  StatusBadge,
  useSelection,
} from "@/components/ui-kit";
import { Search, Edit, Trash2, Package } from "lucide-react";
import { formatPriceBoth } from "@/lib/constants";
import type { Product } from "@/lib/types";

interface ProductsTableProps {
  search: string;
  setSearch: (v: string) => void;
  veh: string;
  setVeh: (v: string) => void;
  cat: string;
  setCat: (v: string) => void;
  vehicleBrands: readonly string[];
  sortedCategories: string[];
  sel: ReturnType<typeof useSelection>;
  allChecked: boolean;
  allFilteredIds: string[];
  sortConfig: { key: string; direction: "ascending" | "descending" } | null;
  requestSort: (key: string) => void;
  pg: {
    paged: Product[];
    page: number;
    setPage: (p: number) => void;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
  usdRate: number;
  t: (k: string, vars?: Record<string, string | number>) => string;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onBulkDelete: () => void;
}

export function ProductsTable({
  search,
  setSearch,
  veh,
  setVeh,
  cat,
  setCat,
  vehicleBrands,
  sortedCategories,
  sel,
  allChecked,
  allFilteredIds,
  sortConfig,
  requestSort,
  pg,
  usdRate,
  t,
  onEdit,
  onDelete,
  onBulkDelete,
}: ProductsTableProps) {
  return (
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
        onDelete={onBulkDelete}
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
                    onClick={() => onEdit(p.id)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("common.delete")}
                    onClick={() => onDelete(p.id, p.name)}
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
  );
}
